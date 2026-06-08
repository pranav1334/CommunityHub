import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";

function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  const googleCredential = location.state?.googleCredential || "";

  const [form, setForm] = useState({
    full_name: "",
    profession: "",
    current_company_college: "",
    city: "",
    bio: "",
    join_reason: "",
    contribution: "",
    linkedin_url: "",
    email: "",
    password: "",
    instagram: "",
    website: "",
    google_credential: googleCredential,
  });

  const [profilePicture, setProfilePicture] = useState(null);
  const [message, setMessage] = useState(location.state?.message || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (googleCredential) {
      setMessage("Google account selected. Fill remaining details to create account.");
    }
  }, [googleCredential]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      setMessage("");
      setIsLoading(true);

      const formData = new FormData();

      Object.keys(form).forEach((key) => {
        formData.append(key, form[key]);
      });

      if (profilePicture && !googleCredential) {
        formData.append("profile_picture", profilePicture);
      }

      const res = await API.post("/auth/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      localStorage.setItem("communityhub_token", res.data.token);
      localStorage.setItem("communityhub_user", JSON.stringify(res.data.user));

      navigate("/communities");
    } catch (error) {
      const errors = error.response?.data?.errors;

      if (errors && errors.length > 0) {
        setMessage(errors[0].msg);
      } else {
        setMessage(error.response?.data?.message || "Registration failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-page">
      <form className="form-card" onSubmit={handleRegister}>
        <h2>Create Account</h2>
        <p>
          {googleCredential
            ? "Google selected. Complete your profile details."
            : "Register to join communities and create your own community."}
        </p>

        {message && (
          <p className={`message ${message.toLowerCase().includes("failed") ? "error" : ""}`}>
            {message}
          </p>
        )}

        <label>Full Name *</label>
        <input
          type="text"
          name="full_name"
          value={form.full_name}
          onChange={handleChange}
          placeholder="Enter your full name"
          required
        />

        {!googleCredential && (
          <>
            <label>Profile Picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfilePicture(e.target.files[0])}
            />
          </>
        )}

        <label>Profession *</label>
        <input
          type="text"
          name="profession"
          value={form.profession}
          onChange={handleChange}
          placeholder="Example: Student, Developer, Designer"
          required
        />

        <label>Current Company / College *</label>
        <input
          type="text"
          name="current_company_college"
          value={form.current_company_college}
          onChange={handleChange}
          placeholder="Enter your company or college name"
          required
        />

        <label>City *</label>
        <input
          type="text"
          name="city"
          value={form.city}
          onChange={handleChange}
          placeholder="Enter your city"
          required
        />

        <label>Bio *</label>
        <textarea
          name="bio"
          value={form.bio}
          onChange={handleChange}
          placeholder="Write a short bio about yourself"
          required
        />

        <label>Why do you want to join communities? *</label>
        <textarea
          name="join_reason"
          value={form.join_reason}
          onChange={handleChange}
          placeholder="Explain why you want to join communities"
          required
        />

        <label>What can you contribute to communities? *</label>
        <textarea
          name="contribution"
          value={form.contribution}
          onChange={handleChange}
          placeholder="Explain what you can contribute"
          required
        />

        <label>LinkedIn URL *</label>
        <input
          type="url"
          name="linkedin_url"
          value={form.linkedin_url}
          onChange={handleChange}
          placeholder="https://www.linkedin.com/in/your-profile"
          required
        />

        <label>Email *</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
        />

        {!googleCredential && (
          <>
            <label>Password *</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters, uppercase, lowercase, number"
              required
            />
          </>
        )}

        <label>Instagram</label>
        <input
          type="url"
          name="instagram"
          value={form.instagram}
          onChange={handleChange}
          placeholder="https://www.instagram.com/your-profile"
        />

        <label>Website</label>
        <input
          type="url"
          name="website"
          value={form.website}
          onChange={handleChange}
          placeholder="https://yourwebsite.com"
        />

        <button type="submit" disabled={isLoading}>
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}

export default Register;