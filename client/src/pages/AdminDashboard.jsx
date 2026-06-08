import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";

function AdminDashboard() {
  const { communityId } = useParams();

  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [currentImages, setCurrentImages] = useState({
    community_logo: "",
    cover_image: "",
  });

  const [newCommunityLogo, setNewCommunityLogo] = useState(null);
  const [newCoverImage, setNewCoverImage] = useState(null);

  const [editForm, setEditForm] = useState({
    community_name: "",
    description: "",
    category: "",
    city: "",
    website: "",
    whatsapp_link: "",
    discord_link: "",
    instagram_link: "",
    community_rules: "",
    approval_type: "admin",
  });

  const [meetupForm, setMeetupForm] = useState({
    title: "",
    description: "",
    meetup_date: "",
    location: "",
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const fetchAdminData = async () => {
    try {
      setMessage("");
      setMessageType("");

      const membersRes = await API.get(`/admin/${communityId}/members`);
      const requestsRes = await API.get(`/admin/${communityId}/requests`);
      const analyticsRes = await API.get(`/admin/${communityId}/analytics`);
      const communityRes = await API.get(`/communities/${communityId}`);

      setMembers(membersRes.data);
      setRequests(requestsRes.data);
      setAnalytics(analyticsRes.data);

      const community = communityRes.data.community;

      setCurrentImages({
        community_logo: community.community_logo || "",
        cover_image: community.cover_image || "",
      });

      setEditForm({
        community_name: community.community_name || "",
        description: community.description || "",
        category: community.category || "",
        city: community.city || "",
        website: community.website || "",
        whatsapp_link: community.whatsapp_link || "",
        discord_link: community.discord_link || "",
        instagram_link: community.instagram_link || "",
        community_rules: community.community_rules || "",
        approval_type: community.approval_type || "admin",
      });
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load admin dashboard.");
      setMessageType("error");
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [communityId]);

  const approveRequest = async (requestId) => {
    try {
      const res = await API.post(`/admin/${communityId}/requests/${requestId}/approve`);

      setMessage(res.data.message);
      setMessageType("success");

      fetchAdminData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to approve request.");
      setMessageType("error");
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      const res = await API.post(`/admin/${communityId}/requests/${requestId}/reject`);

      setMessage(res.data.message);
      setMessageType("success");

      fetchAdminData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to reject request.");
      setMessageType("error");
    }
  };

  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value,
    });
  };

  const updateCommunity = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();

      Object.keys(editForm).forEach((key) => {
        formData.append(key, editForm[key]);
      });

      if (newCommunityLogo) {
        formData.append("community_logo", newCommunityLogo);
      }

      if (newCoverImage) {
        formData.append("cover_image", newCoverImage);
      }

      const res = await API.put(`/admin/${communityId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage(res.data.message);
      setMessageType("success");

      setNewCommunityLogo(null);
      setNewCoverImage(null);

      fetchAdminData();
    } catch (error) {
      const errors = error.response?.data?.errors;

      if (errors && errors.length > 0) {
        setMessage(errors[0].msg);
      } else {
        setMessage(error.response?.data?.message || "Failed to update community.");
      }

      setMessageType("error");
    }
  };

  const handleMeetupChange = (e) => {
    setMeetupForm({
      ...meetupForm,
      [e.target.name]: e.target.value,
    });
  };

  const createMeetup = async (e) => {
    e.preventDefault();

    try {
      const res = await API.post(`/admin/${communityId}/meetups`, meetupForm);

      setMessage(res.data.message);
      setMessageType("success");

      setMeetupForm({
        title: "",
        description: "",
        meetup_date: "",
        location: "",
      });

      fetchAdminData();
    } catch (error) {
      const errors = error.response?.data?.errors;

      if (errors && errors.length > 0) {
        setMessage(errors[0].msg);
      } else {
        setMessage(error.response?.data?.message || "Failed to create meetup.");
      }

      setMessageType("error");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Manage members, requests, community details, images, meetups, and analytics.</p>
      </div>

      {message && (
        <p className={`message ${messageType === "error" ? "error" : ""}`}>
          {message}
        </p>
      )}

      {analytics && (
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Total Members</h3>
            <p>{analytics.totalMembers}</p>
          </div>

          <div className="analytics-card">
            <h3>Pending Requests</h3>
            <p>{analytics.pendingRequests}</p>
          </div>

          <div className="analytics-card">
            <h3>Total Meetups</h3>
            <p>{analytics.totalMeetups}</p>
          </div>
        </div>
      )}

      <div className="section-card">
        <h2>Pending Join Requests</h2>

        {requests.length === 0 ? (
          <p>No pending requests.</p>
        ) : (
          requests.map((request) => (
            <div className="list-item" key={request.id}>
              <h4>{request.full_name}</h4>

              <p>
                <strong>Email:</strong> {request.email}
              </p>

              <p>
                <strong>Profession:</strong> {request.profession}
              </p>

              <p>
                <strong>Company / College:</strong> {request.current_company_college}
              </p>

              <p>
                <strong>City:</strong> {request.city}
              </p>

              <p>
                <strong>Why they want to join:</strong> {request.join_reason}
              </p>

              <p>
                <strong>What they can contribute:</strong> {request.contribution}
              </p>

              <div className="action-row">
                <button onClick={() => approveRequest(request.id)}>Approve</button>

                <button className="danger" onClick={() => rejectRequest(request.id)}>
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="section-card">
        <h2>Members</h2>

        {members.length === 0 ? (
          <p>No members yet.</p>
        ) : (
          members.map((member) => (
            <div className="list-item" key={member.id}>
              <h4>{member.full_name}</h4>

              <p>
                <strong>Email:</strong> {member.email}
              </p>

              <p>
                <strong>Profession:</strong> {member.profession}
              </p>

              <p>
                <strong>Company / College:</strong> {member.current_company_college}
              </p>

              <p>
                <strong>City:</strong> {member.city}
              </p>

              <p>
                <strong>Joined At:</strong>{" "}
                {new Date(member.joined_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="section-card">
        <h2>Edit Community</h2>

        <form onSubmit={updateCommunity} className="join-form">
          <label>Community Name</label>
          <input
            name="community_name"
            value={editForm.community_name}
            onChange={handleEditChange}
            required
          />

          <label>Current Community Logo</label>
          {currentImages.community_logo ? (
            <img
              src={`http://localhost:5000${currentImages.community_logo}`}
              alt="Community Logo"
              className="edit-preview-logo"
            />
          ) : (
            <p>No logo uploaded.</p>
          )}

          <label>Change Community Logo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setNewCommunityLogo(e.target.files[0])}
          />

          <label>Current Cover Image</label>
          {currentImages.cover_image ? (
            <img
              src={`http://localhost:5000${currentImages.cover_image}`}
              alt="Cover"
              className="edit-preview-cover"
            />
          ) : (
            <p>No cover image uploaded.</p>
          )}

          <label>Change Cover Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setNewCoverImage(e.target.files[0])}
          />

          <label>Community Description</label>
          <textarea
            name="description"
            value={editForm.description}
            onChange={handleEditChange}
            required
          />

          <label>Category</label>
          <select
            name="category"
            value={editForm.category}
            onChange={handleEditChange}
            required
          >
            <option value="">Select category</option>
            <option value="Technology">Technology</option>
            <option value="Education">Education</option>
            <option value="Business">Business</option>
            <option value="Startup">Startup</option>
            <option value="Design">Design</option>
            <option value="Sports">Sports</option>
            <option value="Music">Music</option>
            <option value="Health">Health</option>
            <option value="Social Impact">Social Impact</option>
            <option value="Other">Other</option>
          </select>

          <label>City</label>
          <input
            name="city"
            value={editForm.city}
            onChange={handleEditChange}
            required
          />

          <label>Website</label>
          <input
            name="website"
            value={editForm.website}
            onChange={handleEditChange}
          />

          <label>WhatsApp Link</label>
          <input
            name="whatsapp_link"
            value={editForm.whatsapp_link}
            onChange={handleEditChange}
          />

          <label>Discord Link</label>
          <input
            name="discord_link"
            value={editForm.discord_link}
            onChange={handleEditChange}
          />

          <label>Instagram Link</label>
          <input
            name="instagram_link"
            value={editForm.instagram_link}
            onChange={handleEditChange}
          />

          <label>Community Rules</label>
          <textarea
            name="community_rules"
            value={editForm.community_rules}
            onChange={handleEditChange}
            required
          />

          <label>Approval Type</label>
          <select
            name="approval_type"
            value={editForm.approval_type}
            onChange={handleEditChange}
          >
            <option value="admin">Admin Approval</option>
            <option value="auto">Auto Approve</option>
          </select>

          <button type="submit">Update Community</button>
        </form>
      </div>

      <div className="section-card">
        <h2>Create Meetup</h2>

        <form onSubmit={createMeetup} className="join-form">
          <label>Meetup Title</label>
          <input
            name="title"
            value={meetupForm.title}
            onChange={handleMeetupChange}
            required
          />

          <label>Description</label>
          <textarea
            name="description"
            value={meetupForm.description}
            onChange={handleMeetupChange}
          />

          <label>Meetup Date</label>
          <input
            type="datetime-local"
            name="meetup_date"
            value={meetupForm.meetup_date}
            onChange={handleMeetupChange}
            required
          />

          <label>Location</label>
          <input
            name="location"
            value={meetupForm.location}
            onChange={handleMeetupChange}
          />

          <button type="submit">Create Meetup</button>
        </form>
      </div>
    </div>
  );
}

export default AdminDashboard;