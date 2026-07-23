"use client";

import { useEffect, useMemo, useState } from "react";
import { isMotionReduced } from "@/lib/motion";
import styles from "./public-profile.module.css";

function buildTerminalScript(handle: string) {
  const tag = handle ? `@${handle}` : "@guest";

  return `$ whoami
guest@socialize

$ cat ~/.profile
# public identity
export HANDLE=${tag}
export STATUS=online

$ ls ~/links
github/  projects/  writing/

$ curl -s socialize.you/status
{"ok":true,"theme":"terminal"}

$ `;
}

function typingDelay(character: string) {
  if (character === "\n") return 110;
  if (character === " ") return 28;
  return 22 + Math.floor(Math.random() * 18);
}

export function TerminalTyping({ handle }: { handle: string }) {
  const script = useMemo(() => buildTerminalScript(handle), [handle]);
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timeout = 0;

    const finish = (value: string) => {
      if (!cancelled) setDisplayed(value);
    };

    const typeFromStart = () => {
      if (cancelled) return;

      if (isMotionReduced()) {
        finish(script);
        return;
      }

      let index = 0;
      finish("");

      const step = () => {
        if (cancelled) return;
        index += 1;
        finish(script.slice(0, index));

        if (index >= script.length) {
          timeout = window.setTimeout(() => {
            if (!cancelled) typeFromStart();
          }, 5200);
          return;
        }

        timeout = window.setTimeout(step, typingDelay(script[index - 1] ?? ""));
      };

      timeout = window.setTimeout(step, 500);
    };

    typeFromStart();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [script]);

  return (
    <pre className={styles.terminalPrompt} aria-hidden="true">
      <code>{displayed}</code>
      <span className={styles.terminalPromptCursor} />
    </pre>
  );
}
