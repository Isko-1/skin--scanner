"use client";

import { useEffect } from "react";

/**
 * Регистрирует данную родинку как активную в сессии на бэкенде.
 * Благодаря этому любой замер со щупа (даже без UUID в прошивке)
 * автоматически привязывается к открытой на экране родинке!
 */
export function ActiveMoleRegister({ moleId }: { moleId: string }) {
  useEffect(() => {
    fetch("/api/active-mole", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mole_id: moleId }),
    }).catch(() => {});
  }, [moleId]);

  return null;
}
