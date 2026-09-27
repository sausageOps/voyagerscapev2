"use client";

import { forwardRef, useState, type FormEvent } from "react";
import styles from "./CommandInput.module.css";

interface CommandInputProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

const CommandInput = forwardRef<HTMLInputElement, CommandInputProps>(function CommandInput(
  { onSubmit, disabled },
  ref,
) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(value);
    setValue("");
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} autoComplete="off">
      <label className="vs-sr-only" htmlFor="vs-command">
        Enter a command
      </label>
      <span className={styles.glyph} aria-hidden="true">
        :/
      </span>
      <input
        id="vs-command"
        ref={ref}
        className={styles.input}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Enter Command"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        tabIndex={disabled ? -1 : 0}
        enterKeyHint="go"
      />
      <span className={styles.caret} data-filled={value.length > 0} aria-hidden="true" />
      <button type="submit" className="vs-sr-only" tabIndex={-1}>
        Run command
      </button>
    </form>
  );
});

export default CommandInput;
