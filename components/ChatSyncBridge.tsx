import { useEffect, useMemo, useRef } from 'react';

import { threadPetFromCartilla } from '@/lib/active-pet';
import { chatTutorKey } from '@/lib/chat-tutor-key';
import { chatThreadId, fetchLiveThread, pushThreadPet } from '@/lib/live-catalog';
import { useApp } from '@/store/app-store';

export function ChatSyncBridge() {
  const { shopChats, mergeShopChatFromLive, user, shopOrders, pet } = useApp();
  const stamped = useRef(new Set<string>());

  const shopIds = useMemo(() => {
    const ids = new Set(Object.keys(shopChats));
    for (const o of shopOrders) {
      if (o.deliveryStatus === 'awaiting_shop' || o.deliveryStatus === 'confirmed') {
        ids.add(o.shopId);
      }
    }
    return [...ids];
  }, [shopChats, shopOrders]);

  useEffect(() => {
    if (!user || !shopIds.length) return;
    const tutorKey = chatTutorKey(user);
    const petMeta = threadPetFromCartilla(pet);
    let on = true;
    const pull = async () => {
      try {
        for (const shopId of shopIds) {
          const threadId = chatThreadId(shopId, tutorKey);
          const own = await fetchLiveThread(shopId, threadId);
          if (!on) return;
          if (own?.messages?.length) mergeShopChatFromLive(shopId, own.messages);
          if (!own || !petMeta) continue;
          const key = `${own.id}:${petMeta.petName}:${petMeta.petSpecies ?? ''}`;
          if (stamped.current.has(key)) continue;
          if (own.petName !== petMeta.petName || own.petSpecies !== petMeta.petSpecies) {
            stamped.current.add(key);
            void pushThreadPet({
              shopId,
              threadId: own.id,
              petName: petMeta.petName,
              petSpecies: petMeta.petSpecies,
            });
          }
        }
      } catch {
        /* panel apagado */
      }
    };
    pull();
    const t = setInterval(pull, 2500);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [shopIds, user, pet, mergeShopChatFromLive]);

  return null;
}
