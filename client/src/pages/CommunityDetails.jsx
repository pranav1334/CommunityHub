import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../services/api";

function CommunityDetails() {
  const { communityId } = useParams();

  const [communityData, setCommunityData] = useState(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinStatus, setJoinStatus] = useState({
    status: "none",
    message: "",
  });

  const [joinForm, setJoinForm] = useState({
    join_reason: "",
    contribution: "",
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const user = JSON.parse(localStorage.getItem("communityhub_user") || "null");

  const fetchCommunityDetails = async () => {
    try {
      setMessage("");
      setMessageType("");

      const res = await API.get(`/communities/${communityId}`);
      setCommunityData(res.data);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to load community details."
      );
      setMessageType("error");
    }
  };

  const fetchJoinStatus = async () => {
    try {
      const token = localStorage.getItem("communityhub_token");

      if (!token) {
        return;
      }

      const res = await API.get(`/communities/${communityId}/my-status`);
      setJoinStatus(res.data);
    } catch (error) {
      console.log(error.response?.data?.message || "Failed to check join status.");
    }
  };

  useEffect(() => {
    fetchCommunityDetails();
    fetchJoinStatus();
  }, [communityId]);

  const handleJoinChange = (e) => {
    setJoinForm({
      ...joinForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleJoinCommunity = async (e) => {
    e.preventDefault();

    try {
      setMessage("");
      setMessageType("");

      const res = await API.post(`/communities/${communityId}/join`, joinForm);

      setMessage(res.data.message);
      setMessageType("success");

      setJoinForm({
        join_reason: "",
        contribution: "",
      });

      setShowJoinForm(false);

      fetchCommunityDetails();
      fetchJoinStatus();
    } catch (error) {
      const errors = error.response?.data?.errors;

      if (errors && errors.length > 0) {
        setMessage(errors[0].msg);
      } else {
        setMessage(error.response?.data?.message || "Failed to join community.");
      }

      setMessageType("error");
      fetchJoinStatus();
    }
  };

  if (!communityData) {
    return (
      <div className="page">
        <div className="section-card">
          <p>{message || "Loading community details..."}</p>
        </div>
      </div>
    );
  }

  const { community, upcomingMeetups, membersPreview } = communityData;
  const isAdmin = user && user.id === community.admin_id;

  return (
    <div className="page">
      <div className="details-card">
        {community.cover_image ? (
          <img
            src={`http://localhost:5000${community.cover_image}`}
            alt={community.community_name}
            className="cover-image"
          />
        ) : (
          <div className="cover-placeholder">
            <h2>{community.community_name}</h2>
          </div>
        )}

        <div className="details-header">
          {community.community_logo ? (
            <img
              src={`http://localhost:5000${community.community_logo}`}
              alt={community.community_name}
              className="details-logo"
            />
          ) : (
            <div className="details-logo placeholder">
              {community.community_name?.charAt(0)}
            </div>
          )}

          <div>
            <h1>{community.community_name}</h1>
            <p>
              {community.category} • {community.city}
            </p>
          </div>
        </div>

        <div className="section">
          <h3>Community Description</h3>
          <p className="big-text">{community.description}</p>
        </div>

        <div className="info-grid">
          <div>
            <h3>Admin Details</h3>
            <p>
              <strong>Name:</strong> {community.admin_name}
            </p>
            <p>
              <strong>Profession:</strong> {community.admin_profession}
            </p>
            <p>
              <strong>City:</strong> {community.admin_city}
            </p>
          </div>

          <div>
            <h3>Community Stats</h3>
            <p>
              <strong>Member Count:</strong> {community.member_count}
            </p>
            <p>
              <strong>Approval Type:</strong>{" "}
              {community.approval_type === "auto"
                ? "Auto Approve"
                : "Admin Approval"}
            </p>
          </div>
        </div>

        <div className="section">
          <h3>Community Rules</h3>
          <p>{community.community_rules}</p>
        </div>

        {isAdmin && (
          <Link to={`/admin/${community.id}`} className="primary-link">
            Open Admin Dashboard
          </Link>
        )}
      </div>

      <div className="section-card">
        <h2>Upcoming Meetups</h2>

        {upcomingMeetups.length === 0 ? (
          <p>No upcoming meetups available.</p>
        ) : (
          upcomingMeetups.map((meetup) => (
            <div className="list-item" key={meetup.id}>
              <h4>{meetup.title}</h4>
              <p>{meetup.description || "No description added."}</p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(meetup.meetup_date).toLocaleString()}
              </p>
              <p>
                <strong>Location:</strong> {meetup.location || "Not added"}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="section-card">
        <h2>Members Preview</h2>

        <div className="member-grid">
          {membersPreview.length === 0 ? (
            <p>No members yet.</p>
          ) : (
            membersPreview.map((member) => (
              <div className="member-card" key={member.id}>
                {member.profile_picture ? (
                  <img
                    src={`http://localhost:5000${member.profile_picture}`}
                    alt={member.full_name}
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {member.full_name?.charAt(0)}
                  </div>
                )}

                <h4>{member.full_name}</h4>
                <p>{member.profession}</p>
                <p>{member.city}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="section-card">
          <h2>Join Community</h2>

          {message && (
            <p className={`message ${messageType === "error" ? "error" : ""}`}>
              {message}
            </p>
          )}

          {joinStatus.status === "pending" && (
            <p className="message">
              Your join request is already pending. Please wait for admin
              approval.
            </p>
          )}

          {joinStatus.status === "member" && (
            <p className="message">
              You are already a member of this community.
            </p>
          )}

          {joinStatus.status === "approved" && (
            <p className="message">
              Your join request was already approved.
            </p>
          )}

          {joinStatus.status === "rejected" && (
            <p className="message error">
              Your previous request was rejected. You can submit a new request.
            </p>
          )}

          {(joinStatus.status === "none" ||
            joinStatus.status === "rejected") && (
            <>
              <p>
                Click the button and submit your reason to join this community.
              </p>

              {!showJoinForm ? (
                <button
                  type="button"
                  className="join-community-button"
                  onClick={() => setShowJoinForm(true)}
                >
                  Join Community
                </button>
              ) : (
                <form onSubmit={handleJoinCommunity} className="join-form">
                  <label>Why do you want to join this community?</label>
                  <textarea
                    name="join_reason"
                    value={joinForm.join_reason}
                    onChange={handleJoinChange}
                    required
                  />

                  <label>What can you contribute?</label>
                  <textarea
                    name="contribution"
                    value={joinForm.contribution}
                    onChange={handleJoinChange}
                    required
                  />

                  <div className="action-row">
                    <button type="submit">Submit Request</button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() => setShowJoinForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default CommunityDetails;