import { Navigate, useParams, useSearchParams } from "react-router-dom";

// /rates, /rates/:username and /rates?rate=name all open the Dime's rate page.
// The rate page itself sends signed-out visitors to login and back.
export default function RateRedirect() {
  const { username } = useParams();
  const [params] = useSearchParams();
  const dime = username || params.get("rate") || params.get("dime");
  const ref = params.get("ref");
  if (!dime) return <Navigate to={`/rate-girls${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`} replace />;
  const q = new URLSearchParams({ rate: dime });
  if (ref) q.set("ref", ref);
  return <Navigate to={`/rate?${q.toString()}`} replace />;
}
