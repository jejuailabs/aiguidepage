'use client';
import * as Dialog from '@radix-ui/react-dialog';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {X} from 'lucide-react';
import {useTranslations} from 'next-intl';

export function Modal({open, onClose, title, description, children, className = '', returnFocus}: {open: boolean; onClose: () => void; title: string; description: string; children: React.ReactNode; className?: string; returnFocus?: React.RefObject<HTMLElement | null>}) {
  const t = useTranslations('shell');
  const reduced = useReducedMotion();
  return <Dialog.Root open={open} onOpenChange={value => {if (!value) onClose();}}>
    <AnimatePresence>
      {open && <Dialog.Portal forceMount>
        <Dialog.Overlay asChild forceMount><motion.div className="dialog-overlay" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: .18}} /></Dialog.Overlay>
        <Dialog.Content forceMount asChild onCloseAutoFocus={event => {if (returnFocus?.current) {event.preventDefault(); returnFocus.current.focus();}}}>
          <motion.div className={`dialog-panel ${className}`} initial={{opacity: 0, y: reduced ? 0 : 18}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: reduced ? 0 : 12}} transition={{duration: .22}}>
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
            <Dialog.Description className="sr-only">{description}</Dialog.Description>
            <Dialog.Close className="icon-button dialog-close" aria-label={t('close')}><X size={22} /></Dialog.Close>
            {children}
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>}
    </AnimatePresence>
  </Dialog.Root>;
}
