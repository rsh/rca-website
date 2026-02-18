"""Flask API routes and application setup."""
import os

from flask import Flask, request
from flask_cors import CORS
from pydantic import ValidationError

from auth import generate_token, login_required, validate_request_json
from models import Rca, User, WhyNode, db
from schemas import (LoginRequest, RcaCreateRequest, RcaUpdateRequest,
                     RegisterRequest, WhyNodeCreateRequest,
                     WhyNodeUpdateRequest)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://dbadmin:devpassword@localhost:5432/appdb"
)
app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize database
db.init_app(app)


# ============================================================================
# Authentication Endpoints
# ============================================================================


@app.route("/api/auth/register", methods=["POST"])
@validate_request_json(["email", "username", "password"])
def register() -> tuple[dict, int]:
    """Register a new user."""
    try:
        data = RegisterRequest(**request.get_json())
    except ValidationError as e:
        return {"error": e.errors()}, 400

    # Check if user already exists
    if User.query.filter_by(email=data.email).first():
        return {"error": "Email already registered"}, 400

    if User.query.filter_by(username=data.username).first():
        return {"error": "Username already taken"}, 400

    # Create new user
    user = User(email=data.email, username=data.username)
    user.set_password(data.password)

    db.session.add(user)
    db.session.commit()

    # Generate token
    token = generate_token(user.id)

    return {
        "message": "User registered successfully",
        "token": token,
        "user": user.to_dict(include_email=True),
    }, 201


@app.route("/api/auth/login", methods=["POST"])
@validate_request_json(["email", "password"])
def login() -> tuple[dict, int]:
    """Login user."""
    try:
        data = LoginRequest(**request.get_json())
    except ValidationError as e:
        return {"error": e.errors()}, 400

    user = User.query.filter_by(email=data.email).first()
    if not user or not user.check_password(data.password):
        return {"error": "Invalid email or password"}, 401

    token = generate_token(user.id)

    return {
        "message": "Login successful",
        "token": token,
        "user": user.to_dict(include_email=True),
    }, 200


@app.route("/api/auth/me", methods=["GET"])
@login_required
def get_current_user_info(current_user: User) -> tuple[dict, int]:
    """Get current user information."""
    return {"user": current_user.to_dict(include_email=True)}, 200


# ============================================================================
# RCA Endpoints
# ============================================================================


@app.route("/api/rcas", methods=["GET"])
@login_required
def get_rcas(current_user: User) -> tuple[dict, int]:
    """Get all RCAs for the current user."""
    rcas = (
        Rca.query.filter_by(owner_id=current_user.id)
        .order_by(Rca.created_at.desc())
        .all()
    )
    return {"rcas": [rca.to_dict() for rca in rcas]}, 200


@app.route("/api/rcas", methods=["POST"])
@login_required
@validate_request_json(["name"])
def create_rca(current_user: User) -> tuple[dict, int]:
    """Create a new RCA."""
    try:
        data = RcaCreateRequest(**request.get_json())
    except ValidationError as e:
        return {"error": e.errors()}, 400

    rca = Rca(
        name=data.name,
        description=data.description,
        timeline=data.timeline,
        owner_id=current_user.id,
    )
    db.session.add(rca)
    db.session.commit()

    return {"rca": rca.to_dict()}, 201


@app.route("/api/rcas/<int:rca_id>", methods=["GET"])
@login_required
def get_rca(rca_id: int, current_user: User) -> tuple[dict, int]:
    """Get a specific RCA with full why tree."""
    rca = db.session.get(Rca, rca_id)
    if not rca:
        return {"error": "RCA not found"}, 404

    if rca.owner_id != current_user.id:
        return {"error": "Unauthorized"}, 403

    return {"rca": rca.to_dict_with_tree()}, 200


@app.route("/api/rcas/<int:rca_id>", methods=["PATCH"])
@login_required
def update_rca(rca_id: int, current_user: User) -> tuple[dict, int]:
    """Update an RCA."""
    rca = db.session.get(Rca, rca_id)
    if not rca:
        return {"error": "RCA not found"}, 404

    if rca.owner_id != current_user.id:
        return {"error": "Unauthorized"}, 403

    try:
        data = RcaUpdateRequest(**request.get_json())
    except ValidationError as e:
        return {"error": e.errors()}, 400

    if data.name is not None:
        rca.name = data.name
    if data.description is not None:
        rca.description = data.description
    if data.timeline is not None:
        rca.timeline = data.timeline

    db.session.commit()

    return {"rca": rca.to_dict()}, 200


@app.route("/api/rcas/<int:rca_id>", methods=["DELETE"])
@login_required
def delete_rca(rca_id: int, current_user: User) -> tuple[dict, int]:
    """Delete an RCA (cascades nodes)."""
    rca = db.session.get(Rca, rca_id)
    if not rca:
        return {"error": "RCA not found"}, 404

    if rca.owner_id != current_user.id:
        return {"error": "Unauthorized"}, 403

    db.session.delete(rca)
    db.session.commit()

    return {"message": "RCA deleted successfully"}, 200


# ============================================================================
# WhyNode Endpoints
# ============================================================================


@app.route("/api/rcas/<int:rca_id>/nodes", methods=["POST"])
@login_required
@validate_request_json(["content"])
def create_node(rca_id: int, current_user: User) -> tuple[dict, int]:
    """Add a why/root-cause node to an RCA."""
    rca = db.session.get(Rca, rca_id)
    if not rca:
        return {"error": "RCA not found"}, 404

    if rca.owner_id != current_user.id:
        return {"error": "Unauthorized"}, 403

    try:
        data = WhyNodeCreateRequest(**request.get_json())
    except ValidationError as e:
        return {"error": e.errors()}, 400

    # Top-level nodes must be "why" type
    if data.parent_id is None and data.node_type != "why":
        return {"error": "Top-level nodes must be of type 'why'"}, 400

    # Validate parent exists and belongs to same RCA
    if data.parent_id is not None:
        parent = db.session.get(WhyNode, data.parent_id)
        if not parent or parent.rca_id != rca_id:
            return {"error": "Parent node not found in this RCA"}, 404

    # Calculate order for new node
    if data.parent_id is None:
        sibling_count = WhyNode.query.filter_by(rca_id=rca_id, parent_id=None).count()
    else:
        sibling_count = WhyNode.query.filter_by(
            rca_id=rca_id, parent_id=data.parent_id
        ).count()

    node = WhyNode(
        rca_id=rca_id,
        parent_id=data.parent_id,
        node_type=data.node_type,
        content=data.content,
        order=sibling_count,
    )
    db.session.add(node)
    db.session.commit()

    return {"node": node.to_dict()}, 201


@app.route("/api/nodes/<int:node_id>", methods=["PATCH"])
@login_required
def update_node(node_id: int, current_user: User) -> tuple[dict, int]:
    """Update a why node's content or type."""
    node = db.session.get(WhyNode, node_id)
    if not node:
        return {"error": "Node not found"}, 404

    if node.rca.owner_id != current_user.id:
        return {"error": "Unauthorized"}, 403

    try:
        data = WhyNodeUpdateRequest(**request.get_json())
    except ValidationError as e:
        return {"error": e.errors()}, 400

    if data.content is not None:
        node.content = data.content
    if data.node_type is not None:
        # Top-level nodes must stay "why"
        if node.parent_id is None and data.node_type != "why":
            return {"error": "Top-level nodes must be of type 'why'"}, 400
        node.node_type = data.node_type

    db.session.commit()

    return {"node": node.to_dict()}, 200


@app.route("/api/nodes/<int:node_id>", methods=["DELETE"])
@login_required
def delete_node(node_id: int, current_user: User) -> tuple[dict, int]:
    """Delete a why node (cascades children)."""
    node = db.session.get(WhyNode, node_id)
    if not node:
        return {"error": "Node not found"}, 404

    if node.rca.owner_id != current_user.id:
        return {"error": "Unauthorized"}, 403

    db.session.delete(node)
    db.session.commit()

    return {"message": "Node deleted successfully"}, 200


# ============================================================================
# Health Check
# ============================================================================


@app.route("/health", methods=["GET"])
def health() -> tuple[dict, int]:
    """Health check endpoint."""
    return {"status": "healthy"}, 200
