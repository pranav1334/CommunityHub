import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import API from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const saveLogin = (data) => {
    localStorage.setItem("communityhub_token", data.token);
    localStorage.setItem("communityhub_user", JSON.stringify(data.user));
    navigate("/communities");
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setMessage("");

      const res = await API.post("/auth/login", form);

      saveLogin(res.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Login failed.");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setMessage("");

      const res = await API.post("/auth/google", {
        credential: credentialResponse.credential,
      });

      saveLogin(res.data);
    } catch (error) {
      if (error.response?.status === 404) {
        navigate("/register", {
          state: {
            googleCredential: credentialResponse.credential,
            message:
              "Google account selected. Complete your profile to create account.",
          },
        });
      } else {
        setMessage(error.response?.data?.message || "Google login failed.");
      }
    }
  };

  return (
    <div className="form-page">
      <form className="form-card small-form" onSubmit={handleLogin}>
        <h2>Login</h2>
        <p>Login to browse, join, or manage communities.</p>

        {message && <p className="message error">{message}</p>}

        <label>Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
        />

        <label>Password</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Enter your password"
          required
        />

        <button type="submit">Login</button>

        <div className="google-login-box inside-form">
          <p>Or continue with Google</p>

          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setMessage("Google popup failed. Try again.")}
          />
        </div>
      </form>
    </div>
  );
}

export default Login;