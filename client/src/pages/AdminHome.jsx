import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

function AdminHome() {
  const [communities, setCommunities] = useState([]);
  const [message, setMessage] = useState("");

  const fetchMyCommunities = async () => {
    try {
      setMessage("");

      const res = await API.get("/communities/my-created");
      setCommunities(res.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load admin panel.");
    }
  };

  useEffect(() => {
    fetchMyCommunities();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Admin Panel</h1>
        <p>Manage only the communities created by you.</p>
      </div>

      {message && <p className="message error">{message}</p>}

      <div className="section-card">
        <div className="admin-panel-header">
          <h2>My Communities</h2>

          <Link to="/create-community" className="primary-link">
            Create New Community
          </Link>
        </div>

        {communities.length === 0 ? (
          <p>You have not created any communities yet.</p>
        ) : (
          <div className="community-grid">
            {communities.map((community) => (
              <div className="community-card" key={community.id}>
                <div className="community-card-top">
                  {community.community_logo ? (
                    <img
                      src={`http://localhost:5000${community.community_logo}`}
                      alt={community.community_name}
                      className="community-logo"
                    />
                  ) : (
                    <div className="community-logo-placeholder">
                      {community.community_name?.charAt(0)}
                    </div>
                  )}

                  <div>
                    <h3>{community.community_name}</h3>
                    <p>{community.category}</p>
                  </div>
                </div>

                <p className="community-description">
                  {community.description?.slice(0, 120)}...
                </p>

                <div className="community-meta">
                  <span>City: {community.city}</span>
                  <span>Members: {community.member_count}</span>
                  <span>Upcoming Meetups: {community.upcoming_meetup_count}</span>
                  <span>
                    Approval:{" "}
                    {community.approval_type === "auto"
                      ? "Auto Approve"
                      : "Admin Approval"}
                  </span>
                </div>

                <Link to={`/admin/${community.id}`} className="primary-link">
                  Manage Community
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminHome;