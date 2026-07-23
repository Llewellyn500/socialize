import { Brand } from "@/components/brand";
import styles from "./app-loading-state.module.css";

type AppLoadingStateProps = {
  title: string;
  description?: string;
  inline?: boolean;
  embedded?: boolean;
  label?: string;
};

export function AppLoadingState({
  title,
  description,
  inline = false,
  embedded = false,
  label = "Loading",
}: AppLoadingStateProps) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={`${styles.screen} ${inline ? styles.screenInline : ""} ${embedded ? styles.screenEmbedded : ""}`}
    >
      <div className={styles.inner}>
        <div className={styles.reveal} style={{ animationDelay: "0ms" }}>
          <Brand />
        </div>
        <h1 className={`${styles.title} ${styles.reveal}`} style={{ animationDelay: "140ms" }}>
          {title}
        </h1>
        {description ? (
          <p className={`${styles.description} ${styles.reveal}`} style={{ animationDelay: "280ms" }}>
            {description}
          </p>
        ) : null}
        <div className={`${styles.progress} ${styles.reveal}`} style={{ animationDelay: "420ms" }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
