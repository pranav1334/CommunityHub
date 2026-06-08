import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";

function Home() {
  const [communities, setCommunities] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState("newest");
  const [message, setMessage] = useState("");

  const fetchCommunities = async () => {
    try {
      setMessage("");

      const res = await API.get("/communities", {
        params: {
          search,
          category,
          city,
          sort,
        },
      });

      setCommunities(res.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load communities.");
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    fetchCommunities();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Community Directory</h1>
        <p>Browse, search, and join communities.</p>
      </div>

      <form className="filter-box" onSubmit={handleFilter}>
        <input
          type="text"
          placeholder="Search by community name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <input
          type="text"
          placeholder="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <input
          type="text"
          placeholder="Filter by city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Sort by newest</option>
          <option value="member_count">Sort by member count</option>
        </select>

        <button type="submit">Apply</button>
      </form>

      {message && <p className="message error">{message}</p>}

      <div className="community-grid">
        {communities.length === 0 ? (
          <p>No communities found.</p>
        ) : (
          communities.map((community) => (
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
              </div>

              <Link to={`/communities/${community.id}`} className="primary-link">
                View Details
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Home;