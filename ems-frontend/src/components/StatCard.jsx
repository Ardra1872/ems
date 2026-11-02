import './StatCard.css';
function StatCard({ title, value, note, icon, color }) {
  return (
    <div className="stat-card">
      <div className="stat-info">
        <p>{title}</p>
        <h2>{value}</h2>
        <span>{note}</span>
      </div>

      <div
        className="stat-icon"
        style={{ backgroundColor: color }}
      >
        {icon}
      </div>
    </div>
  );
}

export default StatCard;
