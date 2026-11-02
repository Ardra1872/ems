import { useState } from 'react';

// Attendance Trends Multi-Bar Chart
export function AttendanceTrendsChart({ data, title = 'Weekly Attendance Trends' }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const days = data || [
    { day: 'Mon', present: 7, late: 1, absent: 0, leave: 0 },
    { day: 'Tue', present: 6, late: 1, absent: 1, leave: 0 },
    { day: 'Wed', present: 7, late: 0, absent: 0, leave: 1 },
    { day: 'Thu', present: 8, late: 0, absent: 0, leave: 0 },
    { day: 'Fri', present: 6, late: 1, absent: 0, leave: 1 }
  ];

  const maxVal = Math.max(
    8,
    ...days.map(item => item.present + item.late + item.absent + item.leave)
  );
  const chartHeight = 160;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b', fontWeight: 600 }}>{title}</h3>
        <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#10b981' }}></span> Present
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b' }}></span> Late
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444' }}></span> Absent/Leave
          </span>
        </div>
      </div>

      <div style={{ position: 'relative', height: chartHeight + 35, display: 'flex', alignItems: 'flex-end', gap: 20, paddingTop: 30, borderBottom: '1px solid #e2e8f0', paddingLeft: 10, paddingRight: 10 }}>
        {days.map((item, idx) => {
          const presentH = (item.present / maxVal) * chartHeight;
          const lateH = (item.late / maxVal) * chartHeight;
          const leaveH = ((item.absent + item.leave) / maxVal) * chartHeight;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={item.day}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative' }}
            >
              {isHovered && (
                <div style={{
                  position: 'absolute',
                  top: -30,
                  background: '#1e293b',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                  {item.day}: {item.present} Present, {item.late} Late, {item.absent + item.leave} Away
                </div>
              )}

              <div style={{ width: '100%', maxWidth: 44, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: chartHeight }}>
                {/* Present Bar */}
                <div
                  style={{
                    width: '30%',
                    height: `${Math.max(presentH, 4)}px`,
                    backgroundColor: '#10b981',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease, opacity 0.2s',
                    opacity: isHovered ? 1 : 0.85
                  }}
                  title={`Present: ${item.present}`}
                />
                {/* Late Bar */}
                <div
                  style={{
                    width: '30%',
                    height: `${Math.max(lateH, item.late > 0 ? 4 : 0)}px`,
                    backgroundColor: '#f59e0b',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease, opacity 0.2s',
                    opacity: isHovered ? 1 : 0.85
                  }}
                  title={`Late: ${item.late}`}
                />
                {/* Leave Bar */}
                <div
                  style={{
                    width: '30%',
                    height: `${Math.max(leaveH, (item.absent + item.leave) > 0 ? 4 : 0)}px`,
                    backgroundColor: '#ef4444',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease, opacity 0.2s',
                    opacity: isHovered ? 1 : 0.85
                  }}
                  title={`Leave: ${item.absent + item.leave}`}
                />
              </div>

              <span style={{ marginTop: 10, fontSize: 13, color: isHovered ? '#2563eb' : '#64748b', fontWeight: isHovered ? 600 : 500 }}>
                {item.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Task Status Donut Chart
export function TaskCompletionDonut({ pending = 2, inProgress = 2, completed = 2 }) {
  const total = pending + inProgress + completed || 1;
  const completedPct = Math.round((completed / total) * 100);

  // SVG circle calculation
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  const completedStroke = (completed / total) * circumference;
  const inProgressStroke = (inProgress / total) * circumference;
  const pendingStroke = (pending / total) * circumference;

  const completedOffset = 0;
  const inProgressOffset = -completedStroke;
  const pendingOffset = -(completedStroke + inProgressStroke);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 170, height: 170, display: 'grid', placeItems: 'center' }}>
        <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="85" cy="85" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="18" />

          {/* Completed */}
          {completed > 0 && (
            <circle
              cx="85"
              cy="85"
              r={radius}
              fill="none"
              stroke="#10b981"
              strokeWidth="18"
              strokeDasharray={`${completedStroke} ${circumference}`}
              strokeDashoffset={completedOffset}
              strokeLinecap="round"
            />
          )}

          {/* In Progress */}
          {inProgress > 0 && (
            <circle
              cx="85"
              cy="85"
              r={radius}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="18"
              strokeDasharray={`${inProgressStroke} ${circumference}`}
              strokeDashoffset={inProgressOffset}
              strokeLinecap="round"
            />
          )}

          {/* Pending */}
          {pending > 0 && (
            <circle
              cx="85"
              cy="85"
              r={radius}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="18"
              strokeDasharray={`${pendingStroke} ${circumference}`}
              strokeDashoffset={pendingOffset}
              strokeLinecap="round"
            />
          )}
        </svg>

        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{completedPct}%</div>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Finished</div>
        </div>
      </div>

      <div style={{ width: '100%', marginTop: 18, display: 'flex', justifyContent: 'space-around', fontSize: 13 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', color: '#10b981', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
            {completed}
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>Completed</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', color: '#3b82f6', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}></span>
            {inProgress}
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>In Progress</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', color: '#f59e0b', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }}></span>
            {pending}
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>Pending</span>
        </div>
      </div>
    </div>
  );
}

// Department Breakdown Bars
export function DepartmentDistributionBar({ employees = [] }) {
  const counts = employees.reduce((acc, emp) => {
    const dept = emp.department || 'Other';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const total = employees.length || 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const colors = ['#2563eb', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#64748b'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sorted.map(([dept, count], idx) => {
        const pct = Math.round((count / total) * 100);
        const barColor = colors[idx % colors.length];

        return (
          <div key={dept}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
              <span style={{ fontWeight: 500, color: '#334155' }}>{dept}</span>
              <span style={{ color: '#64748b' }}>{count} ({pct}%)</span>
            </div>
            <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: barColor,
                  borderRadius: 4,
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
