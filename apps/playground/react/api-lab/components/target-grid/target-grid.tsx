import type { RefObject } from "react";
import styles from "../../api-lab.module.css";

interface Props {
  conditionReady: boolean;
  focusInputRef: RefObject<HTMLInputElement | null>;
  onDispatchCustomEvent(): void;
  onReveal(): void;
  revealed: boolean;
}

const cards = [
  { id: "api-lab-start", label: "create / step", number: "01" },
  { id: "api-lab-condition", label: "waitUntil", number: "05" },
  { id: "api-lab-actions", label: "action true / false", number: "06" },
  { id: "api-lab-return", label: "advance guard", number: "09" },
  { id: "api-lab-previous", label: "previous", number: "10" },
  { id: "api-lab-auto-advance", label: "auto advance", number: "11" },
] as const;

export function TargetGrid({
  conditionReady,
  focusInputRef,
  onDispatchCustomEvent,
  onReveal,
  revealed,
}: Props) {
  return (
    <section className={styles.targetsSection} aria-labelledby="api-lab-targets-title">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.panelKicker}>Interactive surface</span>
          <h2 id="api-lab-targets-title">Cibles du parcours</h2>
        </div>
        <span>12 étapes · 17 méthodes</span>
      </div>

      <div className={styles.targetGrid}>
        {cards.slice(0, 1).map((card) => (
          <TargetCard key={card.id} {...card} />
        ))}

        <article className={styles.targetCard} id="api-lab-focus">
          <CardNumber>02</CardNumber>
          <label htmlFor="api-lab-focus-input">focusTarget</label>
          <input id="api-lab-focus-input" ref={focusInputRef} placeholder="Le builder me focus" />
        </article>

        <article className={styles.targetCard}>
          <CardNumber>03</CardNumber>
          <span>clickTarget / waitUntilElement</span>
          <button id="api-lab-reveal-button" type="button" onClick={onReveal}>
            Révéler la cible
          </button>
          {revealed ? (
            <strong className={styles.revealedTarget} id="api-lab-revealed">
              Resolver prêt
            </strong>
          ) : null}
        </article>

        {cards.slice(1, 2).map((card) => (
          <TargetCard key={card.id} {...card} state={conditionReady ? "Prête" : "En attente"} />
        ))}

        {cards.slice(2, 3).map((card) => (
          <TargetCard key={card.id} {...card} />
        ))}

        <article className={styles.targetCard}>
          <CardNumber>07</CardNumber>
          <label htmlFor="api-lab-event-field">onTargetEvent([...])</label>
          <input id="api-lab-event-field" placeholder="Survolez ou saisissez" />
        </article>

        <article className={styles.targetCard}>
          <CardNumber>08</CardNumber>
          <span>onTargetEvent('click')</span>
          <button id="api-lab-click-advance" type="button">
            Cliquer pour avancer
          </button>
        </article>

        {cards.slice(3).map((card) => (
          <TargetCard key={card.id} {...card} />
        ))}

        <article className={`${styles.targetCard} ${styles.finalCard}`}>
          <CardNumber>12</CardNumber>
          <span>append / custom event / finish</span>
          <button id="api-lab-custom-event" type="button" onClick={onDispatchCustomEvent}>
            Envoyer api-lab:complete
          </button>
        </article>
      </div>
    </section>
  );
}

function TargetCard({ id, label, number, state }: (typeof cards)[number] & { state?: string }) {
  return (
    <article className={styles.targetCard} id={id}>
      <CardNumber>{number}</CardNumber>
      <span>{label}</span>
      {state ? <strong className={styles.cardState}>{state}</strong> : null}
    </article>
  );
}

function CardNumber({ children }: { children: string }) {
  return <span className={styles.cardNumber}>{children}</span>;
}
