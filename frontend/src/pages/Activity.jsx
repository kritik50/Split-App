import { useEffect, useState } from "react";
import { Activity as ActivityIcon } from "lucide-react";

import { getUserActivity } from "../api/userApi";
import "./Activity.css";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

const Activity = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true);
        const res = await getUserActivity();
        setItems(res.data || []);
      } catch (err) {
        console.error("Failed to fetch activity:", err);
        setError("Could not load recent activity.");
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  return (
    <div className="activity-page">
      <div className="activity-page__container">
        <header className="activity-page__header">
          <h1>Activity</h1>
          <p>Latest expenses and settlements across your groups.</p>
        </header>

        {loading ? (
          <div className="activity-page__list">
            {[1, 2, 3].map((item) => (
              <div key={item} className="skeleton activity-page__skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="activity-page__state activity-page__state--error">{error}</div>
        ) : items.length === 0 ? (
          <div className="activity-page__state">
            <ActivityIcon size={22} />
            <h3>No activity yet</h3>
            <p>Your timeline will show expenses and settlements here.</p>
          </div>
        ) : (
          <div className="activity-page__list">
            {items.map((item) => (
              <article key={`${item.type}-${item.id}`} className="activity-page__card">
                <div className="activity-page__top">
                  <div>
                    <div className="activity-page__group">{item.group_name || `Group ${item.group_id}`}</div>
                    <h3>
                      {item.type === "expense"
                        ? `${item.paid_by} added ${item.notes || "an expense"}`
                        : `${item.paid_by} settled up with ${item.paid_to}`}
                    </h3>
                  </div>
                  <div className="activity-page__amount">Rs{Number(item.amount || 0).toFixed(2)}</div>
                </div>
                <div className="activity-page__meta">{formatDate(item.created_at)}</div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Activity;
