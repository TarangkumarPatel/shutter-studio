import { isAdminAuthenticated } from "@/lib/auth";
import { getGalleryPhotos } from "@/lib/photos";
import { getMessages } from "@/lib/messages";
import LoginForm from "@/components/admin/LoginForm";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAdminAuthenticated();

  if (!authed) {
    return <LoginForm />;
  }

  const [photos, messages] = await Promise.all([getGalleryPhotos(), getMessages()]);
  return <AdminDashboard initialPhotos={photos} initialMessages={messages} />;
}
