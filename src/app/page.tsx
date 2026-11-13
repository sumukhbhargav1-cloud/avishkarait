import { PUBLIC_WEBSITE_URL } from "@/config/site";

export default function HomePage() {
  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href={PUBLIC_WEBSITE_URL} target="_blank" rel="noreferrer" aria-label="AVISHKAR public website">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span>AVISHKAR<span className="brand-light"> / PORTAL</span></span>
        </a>
        <span className="edition">PARTICIPANT PORTAL</span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="live-dot" /> THE NEXT IDEA STARTS HERE</p>
          <h1 id="hero-title">Make room<br />for <span>what’s next.</span></h1>
          <p className="intro">Your home for AVISHKAR event registration and everything that follows. Find your team, bring your idea, and get ready to build.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="/register">Start registration <span aria-hidden="true">↗</span></a>
            <a className="button button-secondary" href="/login">Participant sign in</a>
          </div>
          <p className="launch-note">Event details and registration windows will appear here.</p>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="core">A<span>’26</span></div>
          <span className="art-label label-top">IDEAS IN MOTION</span>
          <span className="art-label label-bottom">AVISHKAR · EST. FOR WHAT’S NEXT</span>
          <span className="spark spark-one">✳</span>
          <span className="spark spark-two">✳</span>
        </div>
      </section>

      <footer className="footer">
        <span>AVISHKAR · INNOVATION STARTS WITH YOU</span>
        <a href={PUBLIC_WEBSITE_URL} target="_blank" rel="noreferrer">Visit the main website <span aria-hidden="true">↗</span></a>
      </footer>
    </main>
  );
}
