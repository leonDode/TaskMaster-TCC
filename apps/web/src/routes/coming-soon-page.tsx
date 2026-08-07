import { PageHeader } from '@/components/layout/page-header';

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <p className="text-body-sm text-on-surface-variant">
        This screen is being built in a later step of the rollout.
      </p>
    </div>
  );
}
