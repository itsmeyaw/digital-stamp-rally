import { redirect } from "next/navigation";

/**
 * /admin root — redirects to the default sub-page /admin/stamps.
 *
 * The full admin dashboard is now split into three sub-pages:
 *   - /admin/stamps  (stamp creation + list)
 *   - /admin/staff   (stamper/redeemer creation + staff list)
 *   - /admin/grants  (grant/revoke user stamps)
 */
export default function AdminPage() {
  redirect("/admin/stamps");
}
