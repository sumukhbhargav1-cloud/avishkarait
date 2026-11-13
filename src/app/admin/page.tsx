import Link from "next/link";
import AdminDashboard from "./dashboard";

export default function AdminPage() {
  return <><header className="admin-topbar"><Link className="brand" href="/"><span className="brand-mark">A<span>.</span></span><span className="brand-copy"><b>AVISHKAR <i>2K26</i></b><small>ADMIN PORTAL</small></span></Link><Link className="admin-home-link" href="/">Public portal ↗</Link></header><AdminDashboard /></>;
}
