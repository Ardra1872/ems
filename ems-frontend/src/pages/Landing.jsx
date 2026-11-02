import { ShieldIcon, UsersIcon, ProjectsIcon, TasksIcon, CheckCircleIcon } from '../components/common/Icons';
import './Landing.css';

const highlights = [
  {
    icon: <UsersIcon size={20} />,
    title: 'People, connected',
    copy: 'Keep employee details, teams, and responsibilities in one dependable place.'
  },
  {
    icon: <ProjectsIcon size={20} />,
    title: 'Projects in motion',
    copy: 'Give every project a clear owner, shared priorities, and visible progress.'
  },
  {
    icon: <TasksIcon size={20} />,
    title: 'The day, in focus',
    copy: 'Bring tasks, attendance, and leave into a calmer daily workflow.'
  }
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Landing() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="/" aria-label="EMS Flow home">
          <span className="landing-brand-mark"><ShieldIcon size={21} /></span>
          <span>ems<span>flow</span></span>
        </a>
        <nav className="landing-nav-links" aria-label="Main navigation">
          <a href="#platform">Platform</a>
          <a href="#benefits">Why EMS Flow</a>
        </nav>
        <a className="landing-nav-login" href="/login">Sign in <ArrowIcon /></a>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow"><span /> PEOPLE. PROJECTS. PROGRESS.</div>
          <h1>Good work starts with <em>everything in sync.</em></h1>
          <p className="landing-hero-description">
            A clearer way to manage your people and their work. Bring teams, projects,
            tasks, and attendance together in one thoughtful workspace.
          </p>
          <div className="landing-hero-actions">
            <a className="landing-primary-button" href="/login">Go to your workspace <ArrowIcon /></a>
            <a className="landing-secondary-link" href="#platform">Explore the platform <span>↓</span></a>
          </div>
          <div className="landing-trust-note">
            <CheckCircleIcon size={16} />
            <span>One secure sign-in. The right view for your role.</span>
          </div>
        </div>

        <div className="landing-visual" aria-label="Preview of the EMS Flow workforce dashboard">
          <div className="landing-orbit landing-orbit-one" />
          <div className="landing-orbit landing-orbit-two" />
          <div className="preview-window">
            <div className="preview-topbar">
              <div className="preview-brand-mark"><ShieldIcon size={15} /></div>
              <span>WORKSPACE</span>
              <div className="preview-topbar-user"><i /> Monday, November 2</div>
            </div>
            <div className="preview-body">
              <div className="preview-greeting">
                <span>MONDAY, NOVEMBER 2, 2026</span>
                <strong>A good day to make progress.</strong>
                <small>Your team's work, at a glance.</small>
              </div>
              <div className="preview-stat-grid">
                <div className="preview-stat">
                  <span>TEAM MEMBERS</span>
                  <strong>24</strong>
                  <small><i className="preview-dot green" /> 21 active today</small>
                </div>
                <div className="preview-stat">
                  <span>PROJECTS</span>
                  <strong>08</strong>
                  <small><i className="preview-dot blue" /> 5 in progress</small>
                </div>
                <div className="preview-stat preview-stat-wide">
                  <div className="preview-task-heading"><span>TEAM PRIORITIES</span><span>THIS WEEK</span></div>
                  <div className="preview-task"><i className="preview-task-icon blue" /><span>Product launch planning</span><b>On track</b></div>
                  <div className="preview-task"><i className="preview-task-icon ochre" /><span>Quarterly team reviews</span><b>In progress</b></div>
                  <div className="preview-task"><i className="preview-task-icon sage" /><span>Design system refresh</span><b>On track</b></div>
                </div>
              </div>
            </div>
          </div>
          <div className="preview-float-card">
            <span className="preview-float-icon"><CheckCircleIcon size={16} /></span>
            <span><strong>All caught up</strong><small>Your team is in sync</small></span>
          </div>
          <div className="preview-float-team"><i /><i /><i /><span>+21</span></div>
        </div>
      </section>

      <section className="landing-platform" id="platform">
        <div className="landing-section-heading" id="benefits">
          <span className="landing-eyebrow">A BETTER WAY TO WORK</span>
          <h2>Less chasing. More moving forward.</h2>
          <p>Everything your team needs to stay aligned, without another complicated tool.</p>
        </div>
        <div className="landing-feature-grid">
          {highlights.map((feature) => (
            <article className="landing-feature-card" key={feature.title}>
              <span className="landing-feature-icon">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <a className="landing-brand landing-footer-brand" href="/">
          <span className="landing-brand-mark"><ShieldIcon size={18} /></span>
          <span>ems<span>flow</span></span>
        </a>
        <span>A more human way to work, together.</span>
        <a href="/login">Sign in to EMS Flow <ArrowIcon /></a>
      </footer>
    </main>
  );
}

export default Landing;