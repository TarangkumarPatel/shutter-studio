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
  // Vercel's serverless functions cap request bodies at 4.5MB, so on Vercel
  // (BLOB_READ_WRITE_TOKEN present) uploads go browser -> Blob directly
  // instead of through our own route. See UploadForm.tsx.
  const blobEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  return (
    <AdminDashboard initialPhotos={photos} initialMessages={messages} blobEnabled={blobEnabled} />
  );
}
