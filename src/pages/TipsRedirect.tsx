import { Navigate, useParams, useSearchParams } from "react-router-dom";

// /tips, /tips/:username and /tips?tip=name all open the Dime's tip page.
// The tip page itself sends signed-out visitors to login and back.
export default function TipsRedirect() {
  const { username } = useParams();
  const [params] = useSearchParams();
  const dime = username || params.get("tip") || params.get("dime");
  const ref = params.get("ref");
  if (!dime) return <Navigate to={`/tip-girls${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`} replace />;
  const q = new URLSearchParams({ tip: dime });
  if (ref) q.set("ref", ref);
  return <Navigate to={`/tip?${q.toString()}`} replace />;
}
