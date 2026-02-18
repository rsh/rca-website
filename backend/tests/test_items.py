"""Tests for WhyNode endpoints."""
from models import Rca, User, WhyNode


def test_create_top_level_why(client, auth_headers, sample_user, db_session):
    """Test creating a top-level why node."""
    rca = Rca(name="Test RCA", owner_id=sample_user.id)
    db_session.add(rca)
    db_session.commit()

    response = client.post(
        f"/api/rcas/{rca.id}/nodes",
        json={"content": "Server crashed", "node_type": "why"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["node"]["content"] == "Server crashed"
    assert data["node"]["node_type"] == "why"
    assert data["node"]["parent_id"] is None


def test_create_child_node(client, auth_headers, sample_user, db_session):
    """Test creating a child why node."""
    rca = Rca(name="Test RCA", owner_id=sample_user.id)
    db_session.add(rca)
    db_session.commit()

    parent = WhyNode(rca_id=rca.id, content="Server crashed", node_type="why", order=0)
    db_session.add(parent)
    db_session.commit()

    response = client.post(
        f"/api/rcas/{rca.id}/nodes",
        json={
            "content": "Out of memory",
            "node_type": "why",
            "parent_id": parent.id,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["node"]["parent_id"] == parent.id


def test_create_root_cause_node(client, auth_headers, sample_user, db_session):
    """Test creating a root cause node under a why."""
    rca = Rca(name="Test RCA", owner_id=sample_user.id)
    db_session.add(rca)
    db_session.commit()

    parent = WhyNode(rca_id=rca.id, content="Crashed", node_type="why", order=0)
    db_session.add(parent)
    db_session.commit()

    response = client.post(
        f"/api/rcas/{rca.id}/nodes",
        json={
            "content": "No monitoring",
            "node_type": "root_cause",
            "parent_id": parent.id,
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["node"]["node_type"] == "root_cause"


def test_top_level_must_be_why(client, auth_headers, sample_user, db_session):
    """Test that top-level nodes must be 'why' type."""
    rca = Rca(name="Test RCA", owner_id=sample_user.id)
    db_session.add(rca)
    db_session.commit()

    response = client.post(
        f"/api/rcas/{rca.id}/nodes",
        json={"content": "Bad", "node_type": "root_cause"},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "top-level" in response.get_json()["error"].lower()


def test_update_node(client, auth_headers, sample_user, db_session):
    """Test updating a node."""
    rca = Rca(name="Test RCA", owner_id=sample_user.id)
    db_session.add(rca)
    db_session.commit()

    node = WhyNode(rca_id=rca.id, content="Original", node_type="why", order=0)
    db_session.add(node)
    db_session.commit()

    response = client.patch(
        f"/api/nodes/{node.id}",
        json={"content": "Updated content"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["node"]["content"] == "Updated content"


def test_delete_node(client, auth_headers, sample_user, db_session):
    """Test deleting a node."""
    rca = Rca(name="Test RCA", owner_id=sample_user.id)
    db_session.add(rca)
    db_session.commit()

    node = WhyNode(rca_id=rca.id, content="To delete", node_type="why", order=0)
    db_session.add(node)
    db_session.commit()
    node_id = node.id

    response = client.delete(f"/api/nodes/{node_id}", headers=auth_headers)
    assert response.status_code == 200

    from models import db

    assert db.session.get(WhyNode, node_id) is None


def test_node_not_found(client, auth_headers, sample_user):
    """Test updating/deleting non-existent node."""
    response = client.patch(
        "/api/nodes/99999",
        json={"content": "Nope"},
        headers=auth_headers,
    )
    assert response.status_code == 404

    response = client.delete("/api/nodes/99999", headers=auth_headers)
    assert response.status_code == 404


def test_cannot_access_other_users_rca(client, db_session):
    """Test that users cannot access RCAs owned by others."""
    user1 = User(email="user1@example.com", username="user1")
    user1.set_password("password123")
    user2 = User(email="user2@example.com", username="user2")
    user2.set_password("password123")
    db_session.add_all([user1, user2])
    db_session.commit()

    rca = Rca(name="User 1 RCA", owner_id=user1.id)
    db_session.add(rca)
    db_session.commit()

    # User 2 tries to access it
    login_response = client.post(
        "/api/auth/login",
        json={"email": "user2@example.com", "password": "password123"},
    )
    token = login_response.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get(f"/api/rcas/{rca.id}", headers=headers)
    assert response.status_code == 403


def test_get_rca_tree_structure(client, auth_headers, sample_user, db_session):
    """Test that the tree structure is returned correctly."""
    rca = Rca(name="Tree Test", owner_id=sample_user.id)
    db_session.add(rca)
    db_session.commit()

    parent = WhyNode(rca_id=rca.id, content="Why 1", node_type="why", order=0)
    db_session.add(parent)
    db_session.commit()

    child = WhyNode(
        rca_id=rca.id,
        content="Because X",
        node_type="why",
        parent_id=parent.id,
        order=0,
    )
    db_session.add(child)
    db_session.commit()

    response = client.get(f"/api/rcas/{rca.id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()

    nodes = data["rca"]["nodes"]
    assert len(nodes) == 1
    assert nodes[0]["content"] == "Why 1"
    assert len(nodes[0]["children"]) == 1
    assert nodes[0]["children"][0]["content"] == "Because X"
