import AdminDashboard from "./dashboard";
import { PUBLIC_WEBSITE_URL } from "@/config/site";

export default function AdminPage() {
  return <><header className="admin-topbar"><a className="brand" href={PUBLIC_WEBSITE_URL} target="_blank" rel="noreferrer"><span className="brand-mark">A<span>.</span></span><span className="brand-copy"><b>AVISHKAR <i>2K26</i></b><small>ADMIN PORTAL</small></span></a><a className="admin-home-link" href={PUBLIC_WEBSITE_URL} target="_blank" rel="noreferrer">Main website ↗</a></header><AdminDashboard /></>;
}
