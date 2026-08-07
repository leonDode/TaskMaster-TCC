import { Copy, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useRegenerateInviteCodeMutation } from '@/features/groups/use-group-mutations';
import { useTranslation } from '@/lib/i18n/use-translation';

interface InviteCodeCardProps {
  groupId: string;
  inviteCode: string;
  isOwner: boolean;
}

export function InviteCodeCard({
  groupId,
  inviteCode,
  isOwner,
}: InviteCodeCardProps) {
  const { t } = useTranslation();
  const regenerate = useRegenerateInviteCodeMutation(groupId);
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success(t('groups.inviteCodeCopiedToast'));
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="bg-card border-outline-variant/10 rounded-lg border p-gutter">
      <p className="text-label-caps text-on-surface-variant mb-3 uppercase">
        {t('groups.inviteCodeLabel')}
      </p>
      <div className="flex items-center gap-3">
        <span className="bg-surface-container-lowest text-neon-cyan text-title-md flex-1 rounded-lg px-4 py-3 font-mono tracking-widest">
          {inviteCode}
        </span>
        <Button variant="outline" size="icon" onClick={copyCode}>
          <Copy className={copied ? 'text-neon-cyan' : ''} />
        </Button>
        {isOwner && (
          <Button
            variant="outline"
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
          >
            <RefreshCw className="size-4" />
            {t('groups.regenerateButton')}
          </Button>
        )}
      </div>
    </div>
  );
}
