import { ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, ChevronDown, Download, LockKeyhole, ReceiptText, Target, Wallet } from 'lucide-react';
import walletImage from '../assets/spendwise-wallet.jpg';
import { money } from '../lib/api';

const features = [
  { title: 'Track transactions', description: 'Log income and expenses in rupees, add notes, and sort entries into categories like food, rent, and transport. Edit or delete entries whenever you need to.', Icon: ReceiptText, color: 'violet' },
  { title: 'Understand your spending', description: 'Pick a month to compare income, expenses, and net balance. See a breakdown of your spending by category and review your latest transactions.', Icon: BarChart3, color: 'mint' },
  { title: 'Set monthly budgets', description: 'Set spending limits by category and check your progress as you log expenses. See when you’ve gone over and update limits as your plans change.', Icon: Target, color: 'rose' },
  { title: 'Export your history', description: 'Download your transactions as a CSV to keep a copy or work with your data in a spreadsheet.', Icon: Download, color: 'mint' },
  { title: 'Review any month', description: 'Use the month picker to view past transactions, monthly totals, and budget progress side by side.', Icon: CalendarDays, color: 'violet' },
  { title: 'Keep your records private', description: 'Your dashboard, transactions, and budgets are linked to your account. Sign in with your email and password to access them.', Icon: LockKeyhole, color: 'rose' },
];

const steps = [
  { title: 'Create your account', description: 'Register with your name, email, and password to open your dashboard.' },
  { title: 'Add a transaction', description: 'Choose income or expense, then enter an amount, category, and date.' },
  { title: 'Check your progress', description: 'Review your monthly totals and set a budget for a category you want to watch.' },
];

export default function LandingPage() {
  return <div className="landing">
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
      <section className="landing-hero landing-wrap" aria-labelledby="landing-title">
        <div className="hero-copy">
          <p className="landing-kicker">Personal expense tracker</p>
          <h1 id="landing-title">Know where your <em>money goes.</em></h1>
          <p className="hero-description">Track every rupee you earn and spend. See what’s left at the end of the month and set budgets for the things that matter to you.</p>
          <div className="landing-actions">
            <a href="/auth?mode=register" className="primary">Create an account <ArrowRight size={17} aria-hidden="true" /></a>
            <a href="#features" className="landing-nav-link">Explore features <ChevronDown size={15} aria-hidden="true" /></a>
          </div>
        </div>

        <div className="hero-visual">
          <img src={walletImage} alt="Indigo wallet, rupee coins, a receipt, and a small bar chart" width={1448} height={1086} fetchPriority="high" />
          <section className="landing-preview" aria-labelledby="preview-title">
            <div className="preview-heading"><h2 id="preview-title">Monthly overview</h2><span>Sample data</span></div>
            <dl className="preview-totals">
              <div><dt><ArrowDownLeft size={15} aria-hidden="true" /> Income</dt><dd>{money(52000)}</dd></div>
              <div><dt><ArrowUpRight size={15} aria-hidden="true" /> Expenses</dt><dd>{money(33250)}</dd></div>
              <div className="preview-balance"><dt>Net balance</dt><dd>{money(18750)}</dd></div>
            </dl>
          </section>
        </div>
      </section>

      <section className="landing-features" id="features" aria-labelledby="features-title">
        <div className="landing-wrap">
          <h2 id="features-title">Everything you need to track your spending</h2>
          <div className="landing-feature-grid">
            {features.map(({ title, description, Icon, color }) => <article key={title}>
              <span className={`stat-icon ${color}`}><Icon size={21} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section className="landing-workflow landing-wrap" id="how-it-works" aria-labelledby="workflow-title">
        <h2 id="workflow-title">How it works</h2>
        <ol className="landing-steps">
          {steps.map(({ title, description }) => <li key={title}>
            <h3>{title}</h3>
            <p>{description}</p>
          </li>)}
        </ol>
      </section>

      <section className="landing-cta landing-wrap" aria-labelledby="cta-title">
        <h2 id="cta-title">Start with your first transaction</h2>
        <a className="primary" href="/auth?mode=register">Create an account <ArrowRight size={17} aria-hidden="true" /></a>
      </section>
    </main>

    <footer className="landing-footer landing-wrap">
      <a className="landing-brand" href="/" aria-label="Spendwise home">spendwise<span className="brand-dot">.</span></a>
      <a className="landing-nav-link" href="/auth">Sign in <ArrowUpRight size={14} aria-hidden="true" /></a>
    </footer>
  </div>;
}

