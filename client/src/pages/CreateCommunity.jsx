import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function CreateCommunity() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
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

  const [communityLogo, setCommunityLogo] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();

    try {
      setMessage("");

      const formData = new FormData();

      Object.keys(form).forEach((key) => {
        formData.append(key, form[key]);
      });

      if (communityLogo) {
        formData.append("community_logo", communityLogo);
      }

      if (coverImage) {
        formData.append("cover_image", coverImage);
      }

      const res = await API.post("/communities", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      navigate(`/communities/${res.data.community.id}`);
    } catch (error) {
      const errors = error.response?.data?.errors;

      if (errors && errors.length > 0) {
        setMessage(errors[0].msg);
      } else {
        setMessage(error.response?.data?.message || "Failed to create community.");
      }
    }
  };

  return (
    <div className="form-page">
      <form className="form-card" onSubmit={handleCreateCommunity}>
        <h2>Create Community</h2>
        <p>Create and manage your own community.</p>

        {message && <p className="message error">{message}</p>}

        <label>Community Name *</label>
        <input
          name="community_name"
          value={form.community_name}
          onChange={handleChange}
          required
        />

        <label>Community Logo</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCommunityLogo(e.target.files[0])}
        />

        <label>Cover Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCoverImage(e.target.files[0])}
        />

        <label>Community Description *</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          required
        />

        <label>Category *</label>
        <input name="category" value={form.category} onChange={handleChange} required />

        <label>City *</label>
        <input name="city" value={form.city} onChange={handleChange} required />

        <label>Website</label>
        <input name="website" value={form.website} onChange={handleChange} />

        <label>WhatsApp Link</label>
        <input name="whatsapp_link" value={form.whatsapp_link} onChange={handleChange} />

        <label>Discord Link</label>
        <input name="discord_link" value={form.discord_link} onChange={handleChange} />

        <label>Instagram Link</label>
        <input name="instagram_link" value={form.instagram_link} onChange={handleChange} />

        <label>Community Rules *</label>
        <textarea
          name="community_rules"
          value={form.community_rules}
          onChange={handleChange}
          required
        />

        <label>Approval Type *</label>
        <select name="approval_type" value={form.approval_type} onChange={handleChange}>
          <option value="admin">Admin Approval</option>
          <option value="auto">Auto Approve</option>
        </select>

        <button type="submit">Create Community</button>
      </form>
    </div>
  );
}

export default CreateCommunity;