import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import API from "../services/api";

function AuthLanding() {
  const navigate = useNavigate();

  const saveLogin = (data) => {
    localStorage.setItem("communityhub_token", data.token);
    localStorage.setItem("communityhub_user", JSON.stringify(data.user));
    navigate("/communities");
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
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
        alert(error.response?.data?.message || "Google login failed.");
      }
    }
  };

  return (
    <div className="auth-landing">
      <div className="auth-hero">
        <div className="auth-badge">Community Directory & Management</div>

        <h1>Discover Communities That Match Your Goals</h1>

        <p>
          Join trusted communities, connect with members, attend meetups, and
          manage everything in one secure platform.
        </p>

        <div className="auth-actions">
          <Link to="/login" className="auth-primary-btn">
            Login
          </Link>

          <Link to="/register" className="auth-secondary-btn">
            Create Account
          </Link>
        </div>

        <div className="google-login-box">
          <div className="custom-google-row">
            <span>Continue with Google</span>

            <GoogleLogin
              type="icon"
              shape="circle"
              size="large"
              onSuccess={handleGoogleSuccess}
              onError={() => alert("Google popup failed. Try again.")}
            />
          </div>
        </div>
      </div>

      <div className="auth-preview-card">
        <h3>What you can do</h3>

        <div className="preview-item">
          <span>01</span>
          <p>Browse and search communities</p>
        </div>

        <div className="preview-item">
          <span>02</span>
          <p>Join communities with approval flow</p>
        </div>

        <div className="preview-item">
          <span>03</span>
          <p>Create and manage your own community</p>
        </div>

        <div className="preview-item">
          <span>04</span>
          <p>Approve requests and create meetups</p>
        </div>
      </div>
    </div>
  );
}

export default AuthLanding;