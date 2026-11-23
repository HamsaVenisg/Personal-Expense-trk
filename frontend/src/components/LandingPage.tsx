import { useState } from 'react';
import { ArrowRight, ArrowUpRight, BarChart3, Check, CalendarDays, Download, LockKeyhole, ReceiptText, Target, Wallet } from 'lucide-react';
import walletImage from '../assets/spendwise-wallet.jpg';
import { money } from '../lib/api';

const features = [
  { title: 'Track transactions', description: 'Log expenses in rupees, add notes, and organize entries into categories like food, rent, and transport. Edit or delete expenses whenever you need to.', Icon: ReceiptText },
  { title: 'Understand your spending', description: 'Compare six months of spending and see where your money goes by category. Review recent expenses alongside your monthly totals.', Icon: BarChart3 },
  { title: 'Set monthly budgets', description: 'Set spending limits by category and check your progress as you log expenses. See when you’ve gone over and update limits as your plans change.', Icon: Target },
  { title: 'Export your history', description: 'Download your expenses as a CSV to keep a copy or work with your data in a spreadsheet.', Icon: Download },
  { title: 'Review any month', description: 'Use the month picker to view past expenses, monthly totals, and budget progress side by side.', Icon: CalendarDays },
  { title: 'Keep your records private', description: 'Your dashboard, expenses, and budgets are linked to your account. Sign in with your email and password to access them.', Icon: LockKeyhole },
];

const spending = [
  { month: 'Jun', amount: 16200 },
  { month: 'Jul', amount: 19900 },
  { month: 'Aug', amount: 17400 },
  { month: 'Sep', amount: 21300 },
  { month: 'Oct', amount: 18900 },
  { month: 'Nov', amount: 18450 },
];
const breakdown = [
  { name: 'Food', percent: 42, color: '#0b9777' },
  { name: 'Bills', percent: 33, color: '#f5a623' },
  { name: 'Travel', percent: 25, color: '#2d89b8' },
];
const steps = [
  { title: 'Create your account', description: 'Sign up with your name and email.' },
  { title: 'Log an expense', description: 'Enter the amount, category, and date.' },
  { title: 'Review your month', description: 'See where you spent the most and set a budget for next month.' },
];

function DashboardPreview() {
  const [selected, setSelected] = useState(spending.length - 1);
  const [added, setAdded] = useState(false);
  const latest = selected === spending.length - 1;
  const amount = spending[selected].amount + (latest && added ? 1250 : 0);
  const categories = latest && added
    ? breakdown.map((category, index) => ({
        ...category,
        percent: index === 0 ? 46 : index === 1 ? 31 : 23,
      }))
    : breakdown;
  let offset = 0;
  const segments = categories.map(({ color, percent }) => {
    const segment = color + ' ' + offset + '% ' + (offset + percent) + '%';
    offset += percent;
    return segment;
  }).join(', ');
  return (
    <figure className="landing-product" aria-labelledby="product-caption">
      <figcaption id="product-caption"><Wallet size={17} aria-hidden="true" /> Monthly overview <span>Sample data</span></figcaption>
      <div className="product-body">
        <dl className="product-stats">
          <div><dt>Spent this month</dt><dd>{money(amount)}</dd></div>
          <div><dt>Monthly budget</dt><dd>{money(25000)}</dd></div>
          <div><dt>Expenses</dt><dd>{latest ? (added ? 43 : 42) : Math.round(amount / 450)}</dd></div>
        </dl>
        <div className="product-charts">
          <section className="product-chart">
            <h2>Monthly spending</h2><p className="preview-hint">Select a month to explore</p>
            <ul className="preview-bars">
              {spending.map(({ month, amount: monthlyAmount }, index) => (
                <li key={month}><button type="button" aria-pressed={index === selected} onClick={() => setSelected(index)}>
                  <span className="preview-bar-track">
                    <span className="preview-bar" style={{ height: (monthlyAmount + (added && index === spending.length - 1 ? 1250 : 0)) / 230 + '%' }} aria-hidden="true" />
                  </span>
                  <span>{month}</span><span className="landing-visually-hidden"> {money(monthlyAmount + (added && index === spending.length - 1 ? 1250 : 0))}</span></button>
                </li>
              ))}
            </ul>
          </section>
          <section className="product-chart">
            <h2>By category</h2>
            <div className="preview-donut" style={{ background: 'conic-gradient(' + segments + ')' }} aria-hidden="true"><span>{spending[selected].month}</span></div>
            <ul className="preview-legend">
              {categories.map(({ name, percent, color }) => <li key={name}><i style={{ background: color }} aria-hidden="true" />{name}<strong>{percent}%</strong></li>)}
            </ul>
          </section>
        </div>
        <div className="preview-controls">
          <button className="preview-action" type="button" onClick={() => { setSelected(spending.length - 1); setAdded(!added); }}>
            {added ? 'Reset demo' : 'Try adding an expense'} <ArrowRight size={15} aria-hidden="true" />
          </button>
          <div role="status" className="preview-feedback">
            {added && <div className="preview-entry"><span><Check size={15} aria-hidden="true" /></span><div><strong>Expense added</strong><small>Groceries · Food</small></div><b>{money(1250)}</b></div>}
          </div>
        </div>
      </div>
    </figure>
  );
}

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-header landing-wrap">
        <a className="landing-brand" href="/" aria-label="Spendwise home">
          <span className="logo-box"><Wallet size={21} aria-hidden="true" /></span>
          <span>spendwise<span className="brand-dot">.</span></span>
        </a>
        <nav aria-label="Main navigation">
          <a className="landing-nav-link" href="#features">Features</a>
          <a className="landing-nav-link" href="#how-it-works">How it works</a>
          <a className="secondary" href="/auth">Sign in <ArrowUpRight size={14} aria-hidden="true" /></a>
        </nav>
      </header>

      <main>
        <div className="landing-hero-band"><section className="landing-hero landing-wrap" aria-labelledby="landing-title">
          <div className="hero-copy">
            <p className="hero-kicker"><Wallet size={16} aria-hidden="true" /> Personal expense tracker</p><h1 id="landing-title">Make sense of <em>every rupee.</em></h1>
            <p className="hero-description">Track daily expenses, see how your spending changes month to month, and set limits for the categories that matter to you.</p>
            <div className="landing-actions">
              <a href="/auth?mode=register" className="primary">Create an account <ArrowRight size={17} aria-hidden="true" /></a>
              <a href="#features" className="landing-nav-link">Explore features</a>
            </div>
          </div>
          <div className="hero-product-scene"><img src={walletImage} alt="" width={1448} height={1086} fetchPriority="high" /><DashboardPreview /></div>
        </section></div>

        <section className="landing-features" id="features" aria-labelledby="features-title">
          <div className="landing-wrap">
            <h2 id="features-title">Everything you need to track your spending</h2>
            <div className="landing-feature-grid">
              {features.map(({ title, description, Icon }) => (
                <article key={title}>
                  <span className="landing-feature-icon"><Icon size={21} aria-hidden="true" /></span>
                  <div><h3>{title}</h3><p>{description}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-workflow landing-wrap" id="how-it-works" aria-labelledby="workflow-title">
          <img src={walletImage} alt="Wallet, rupee coins, and a receipt" width={1448} height={1086} loading="lazy" />
          <div>
            <h2 id="workflow-title">Start with one expense</h2>
            <ol className="landing-steps">
              {steps.map(({ title, description }) => <li key={title}><h3>{title}</h3><p>{description}</p></li>)}
            </ol>
          </div>
        </section>

        <section className="landing-cta landing-wrap" aria-labelledby="cta-title">
          <h2 id="cta-title">Ready to track your spending?</h2>
          <a className="primary" href="/auth?mode=register">Create an account <ArrowRight size={17} aria-hidden="true" /></a>
        </section>
      </main>

      <footer className="landing-footer landing-wrap">
        <a className="landing-brand" href="/" aria-label="Spendwise home">spendwise<span className="brand-dot">.</span></a>
        <a className="landing-nav-link" href="/auth">Sign in <ArrowUpRight size={14} aria-hidden="true" /></a>
      </footer>
    </div>
  );
}
