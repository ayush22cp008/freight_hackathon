import { redirect } from 'next/navigation';

export default function ReviewerRootPage() {
  redirect('/reviewer/queue');
}
