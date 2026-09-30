"use client";

import { useEffect, useRef, useState } from "react";

type Screen = "standby" | "new" | "message" | "sent";
type PageStage = "number" | "message";

const KEYS = [
  "1", "2", "3",
  "4", "5", "6",
  "7", "8", "9",
  "*", "0", "#",
];

const DTMF: Record<string, [number, number]> = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],

  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],

  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],

  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
};

function playDTMF(key: string) {
  const frequencies = DTMF[key];
  if (!frequencies) return;

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const gain = context.createGain();

  const now = context.currentTime;

  gain.gain.setValueAtTime(0.055, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  gain.connect(context.destination);

  frequencies.forEach((frequency) => {
    const oscillator = context.createOscillator();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);

    oscillator.connect(gain);

    oscillator.start(now);
    oscillator.stop(now + 0.12);
  });

  window.setTimeout(() => {
    void context.close();
  }, 200);
}

function playPagerAlert() {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextClass) return;

  const context = new AudioContextClass();

  function beep(delay: number) {
    const start = context.currentTime + delay;

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(1850, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.04, start + 0.01);
    gain.gain.setValueAtTime(0.04, start + 0.12);
    gain.gain.linearRampToValueAtTime(0.0001, start + 0.15);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(start);
    oscillator.stop(start + 0.15);
  }

  beep(0);
  beep(0.22);
  beep(0.44);

  window.setTimeout(() => {
    void context.close();
  }, 800);
}

export default function Pager({ number, onLogout }: { number: string; onLogout: () => void }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const timers = useRef<Set<number>>(new Set());
  function later(callback: () => void, delay: number) {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    timers.current.add(timer);
  }
  useEffect(() => {
    const pending = timers.current;
    return () => { pending.forEach(window.clearTimeout); pending.clear(); };
  }, []);
  const [screen, setScreen] = useState<Screen>("standby");

  const [keypadOpen, setKeypadOpen] = useState(false);
  const [pageStage, setPageStage] =
    useState<PageStage>("number");

  const [pagerNumber, setPagerNumber] = useState("");
  const [pageMessage, setPageMessage] = useState("");

  const [lcdFlash, setLcdFlash] = useState(false);
  const [pagerBuzz, setPagerBuzz] = useState(false);

  function flashLCD() {
    setLcdFlash(true);

    later(() => {
      setLcdFlash(false);
    }, 120);
  }

  function changeScreen(next: Screen) {
    flashLCD();
    setScreen(next);
  }

  function nextScreen() {
    setSettingsOpen(false);
    if (screen === "standby") {
      playPagerAlert();

      changeScreen("new");

      setPagerBuzz(true);

      later(() => {
        setPagerBuzz(false);
      }, 500);

      return;
    }

    if (screen === "new") {
      changeScreen("message");
      return;
    }

    changeScreen("standby");
  }

  function openKeypad() {
    setSettingsOpen(false);
    setPagerNumber("");
    setPageMessage("");
    setPageStage("number");
    setKeypadOpen(true);
  }

  function closeKeypad() {
    setKeypadOpen(false);
    setPagerNumber("");
    setPageMessage("");
    setPageStage("number");
  }

  function pressKey(key: string) {
    playDTMF(key);

    if (key === "*") {
      if (pageStage === "number") {
        setPagerNumber((value) =>
          value.slice(0, -1)
        );
      } else {
        setPageMessage((value) =>
          value.slice(0, -1)
        );
      }

      return;
    }

    if (key === "#") {
      if (pageStage === "number") {
        if (pagerNumber.length !== 7) {
          flashLCD();
          return;
        }

        flashLCD();
        setPageStage("message");
        return;
      }

      if (pageMessage.length === 0) {
        flashLCD();
        return;
      }

      setKeypadOpen(false);

      changeScreen("sent");

      later(() => {
        changeScreen("standby");
      }, 1800);

      return;
    }

    if (pageStage === "number") {
      if (pagerNumber.length >= 7) return;

      setPagerNumber(
        (value) => value + key
      );

      return;
    }

    if (pageMessage.length >= 15) return;

    setPageMessage(
      (value) => value + key
    );
  }

  function formatPagerNumber(value: string) {
    if (!value) {
      return "___-____";
    }

    if (value.length <= 3) {
      return (
        value.padEnd(3, "_") +
        "-____"
      );
    }

    return (
      value.slice(0, 3) +
      "-" +
      value
        .slice(3)
        .padEnd(4, "_")
    );
  }

  function openPhone() {
    window.location.href = "tel:";
  }

  function openMessages() {
    window.location.href = "sms:";
  }

  useEffect(() => {
    function escapeKey(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        closeKeypad();
        setSettingsOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      escapeKey
    );

    return () => {
      window.removeEventListener(
        "keydown",
        escapeKey
      );
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#918c80] flex items-center justify-center p-5 overflow-hidden">

      {/* PAGER */}

      <section
        className={`
          pager-shell
          relative w-full max-w-[620px] aspect-[1.72/1]
          rounded-[30px_24px_28px_32px]
          border-[3px] border-[#080808]
          bg-[#171816]
          shadow-[0_26px_45px_rgba(0,0,0,.42),inset_0_2px_1px_rgba(255,255,255,.12),inset_0_-5px_8px_rgba(0,0,0,.65)]
          ${pagerBuzz ? "pager-buzz" : ""}
        `}
      >

        {/* LCD BEZEL */}

        <div
          className="
            absolute left-[5%] right-[5%] top-[8%] h-[53%]
            rounded-[9px]
            border-[5px] border-[#070807]
            bg-[#0b0c0b]
            p-[3%]
            shadow-[inset_0_3px_9px_rgba(0,0,0,.95)]
          "
        >

          {/* LCD */}

          <div
            className={`
              relative h-full overflow-hidden
              rounded-[2px]
              border border-[#4c5546]
              bg-[#9faa8e]
              shadow-[inset_0_0_22px_rgba(43,55,38,.38)]
              ${lcdFlash ? "lcd-flash" : ""}
            `}
          >

            <div
              className="
                pointer-events-none absolute inset-0 z-10 opacity-20
                [background:repeating-linear-gradient(0deg,transparent_0px,transparent_3px,#5c6654_4px)]
              "
            />

            <div className="relative h-full px-[5%] py-[5%] font-mono font-bold text-[#20291d]">

              {settingsOpen && (
                <div className="pager-settings lcd-enter" id="pager-settings">
                  <div><span>PAGER NO.</span><strong>{formatPagerNumber(number)}</strong></div>
                  <button onClick={onLogout}>LOG OUT</button>
                </div>
              )}

              {/* STANDBY */}

              {!settingsOpen && screen === "standby" && (
                <div className="lcd-enter flex h-full flex-col justify-between">

                  <div className="flex items-center justify-between text-[11px] tracking-[.12em] sm:text-sm">
                    <span>PIPPI</span>
                    <span>●</span>
                  </div>

                  <div className="flex items-end justify-between">

                    <span className="text-[clamp(20px,5vw,38px)] leading-none tracking-[.08em]">
                      {formatPagerNumber(number)}
                    </span>

                    <span className="pb-1 text-[10px] sm:text-xs">
                      18:42
                    </span>

                  </div>

                </div>
              )}

              {/* NEW PAGE */}

              {!settingsOpen && screen === "new" && (
                <div className="lcd-enter flex h-full items-center justify-center">

                  <span className="lcd-blink text-[clamp(25px,6vw,48px)] leading-none tracking-[.08em]">
                    NEW PAGE 01
                  </span>

                </div>
              )}

              {/* MESSAGE */}

              {!settingsOpen && screen === "message" && (
                <div className="lcd-enter flex h-full flex-col justify-between">

                  <div className="text-[clamp(30px,8vw,58px)] leading-none tracking-[.12em]">
                    8282
                  </div>

                  <div className="flex items-end justify-between text-[11px] tracking-[.08em] sm:text-sm">

                    <span>
                      {formatPagerNumber(number)}
                    </span>

                    <span>
                      18:52
                    </span>

                  </div>

                </div>
              )}

              {/* SENT */}

              {!settingsOpen && screen === "sent" && (
                <div className="lcd-enter flex h-full items-center justify-center">

                  <span className="text-[clamp(24px,6vw,46px)] tracking-[.1em]">
                    PAGE SENT
                  </span>

                </div>
              )}

            </div>

          </div>

        </div>

        {/* LOGO */}

        <div
          className="
            pager-brand absolute left-[8%] top-[66%]
            text-[clamp(12px,2.5vw,18px)]
            font-black italic tracking-[.28em]
            text-[#aaa9a3]
            [text-shadow:0_-1px_0_#050505,0_1px_0_#30302d]
          "
        >
          PIPPI
        </div>

        <button className="settings-switch" aria-label="설정" aria-expanded={settingsOpen}
          aria-controls="pager-settings" onClick={() => { flashLCD(); setSettingsOpen(value => !value); }}>•••</button>

        {/* BUTTONS */}

        <div
          className="
            absolute bottom-[8%] right-[6%]
            flex items-end gap-[clamp(8px,2vw,16px)]
          "
        >

          <PagerButton
            label="▶"
            aria="확인 또는 다음 호출"
            onClick={nextScreen}
          />

          <PagerButton
            label="PAGE"
            aria="삐삐 호출 보내기"
            onClick={openKeypad}
          />

          <PagerButton
            label="TEL"
            aria="전화 앱 열기"
            onClick={openPhone}
          />

          <PagerButton
            label="MSG"
            aria="메시지 앱 열기"
            onClick={openMessages}
          />

        </div>

        <div className="pointer-events-none absolute inset-[2px] rounded-[26px] border border-white/5" />

      </section>

      {/* TELEPHONE KEYPAD */}

      {keypadOpen && (
        <div
          className="
            keypad-backdrop overflow-y-auto
            fixed inset-0 z-50
            flex items-center justify-center
            bg-black/60
            p-5
          "
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeKeypad();
            }
          }}
        >

          <div
            className="
              keypad-pop
              w-full max-w-[330px]
              rounded-[14px]
              border-[3px] border-[#080808]
              bg-[#242521]
              p-4
              shadow-[0_25px_60px_rgba(0,0,0,.75),inset_0_1px_0_rgba(255,255,255,.12)]
            "
          >

            {/* KEYPAD LCD */}

            <div
              className={`
                mb-4
                rounded-[3px]
                border-[4px] border-[#090909]
                bg-[#9faa8e]
                px-4 py-3
                font-mono font-bold
                text-[#20291d]
                shadow-[inset_0_0_12px_rgba(43,55,38,.4)]
                ${lcdFlash ? "lcd-flash" : ""}
              `}
            >

              <div className="text-[9px] tracking-[.18em]">

                {pageStage === "number"
                  ? "PAGER NUMBER"
                  : "NUMERIC MESSAGE"}

              </div>

              <div className="keypad-value mt-2 min-h-[27px] text-xl tracking-[.16em]">

                {pageStage === "number"
                  ? formatPagerNumber(
                      pagerNumber
                    )
                  : pageMessage || "_"}

              </div>

              <div className="mt-2 text-[8px] tracking-[.12em] opacity-70">

                {pageStage === "number"
                  ? `${pagerNumber.length}/7   # NEXT   * DELETE`
                  : `${pageMessage.length}/15   # SEND   * DELETE`}

              </div>

            </div>

            {/* KEYS */}

            <div className="grid grid-cols-3 gap-2">

              {KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() =>
                    pressKey(key)
                  }
                  className="
                    telephone-key
                    h-12
                    rounded-[5px]
                    border-2 border-[#090909]
                    bg-[#363732]
                    font-mono
                    text-lg font-bold
                    text-[#c6c5bd]
                    shadow-[inset_0_2px_1px_rgba(255,255,255,.12),0_4px_0_#090909]
                  "
                >
                  {key}
                </button>
              ))}

            </div>

            <button
              onClick={closeKeypad}
              className="
                mt-5 w-full
                border-t border-[#4a4b45]
                pt-4
                font-mono
                text-[10px] font-bold
                tracking-[.2em]
                text-[#aaa9a3]
                active:translate-y-[1px]
              "
            >
              CANCEL
            </button>

          </div>

        </div>
      )}

      {/* ANIMATIONS */}

      <style>{`

        .pager-button {
          transition:
            transform 45ms steps(2, end),
            box-shadow 45ms steps(2, end);
        }

        .pager-button:active {
          transform: translateY(3px);

          box-shadow:
            inset 0 2px 4px rgba(0,0,0,.8),
            0 1px 0 #090909;
        }


        .telephone-key {
          transition:
            transform 35ms steps(2,end),
            box-shadow 35ms steps(2,end),
            filter 35ms steps(2,end);
        }

        .telephone-key:active {
          transform: translateY(3px);

          filter: brightness(.8);

          box-shadow:
            inset 0 2px 4px rgba(0,0,0,.8),
            0 1px 0 #090909;
        }


        @keyframes pagerBuzz {

          0% {
            transform: translateX(0);
          }

          10% {
            transform:
              translateX(-4px)
              rotate(-.4deg);
          }

          20% {
            transform:
              translateX(4px)
              rotate(.4deg);
          }

          30% {
            transform:
              translateX(-3px)
              rotate(-.3deg);
          }

          40% {
            transform:
              translateX(3px)
              rotate(.3deg);
          }

          50% {
            transform: translateX(-2px);
          }

          60% {
            transform: translateX(2px);
          }

          75% {
            transform: translateX(-1px);
          }

          100% {
            transform: translateX(0);
          }

        }

        .pager-buzz {
          animation:
            pagerBuzz
            420ms
            steps(8,end);
        }


        @keyframes lcdFlash {

          0% {
            filter: brightness(1);
          }

          25% {
            filter: brightness(.55);
          }

          50% {
            filter: brightness(1.35);
          }

          100% {
            filter: brightness(1);
          }

        }

        .lcd-flash {
          animation:
            lcdFlash
            110ms
            steps(3,end);
        }


        @keyframes lcdEnter {

          0% {
            opacity: 0;
          }

          35% {
            opacity: .25;
          }

          60% {
            opacity: 1;
          }

          72% {
            opacity: .65;
          }

          100% {
            opacity: 1;
          }

        }

        .lcd-enter {
          animation:
            lcdEnter
            160ms
            steps(4,end);
        }


        @keyframes lcdBlink {

          0%,45% {
            opacity: 1;
          }

          46%,70% {
            opacity: .18;
          }

          71%,100% {
            opacity: 1;
          }

        }

        .lcd-blink {
          animation:
            lcdBlink
            850ms
            steps(1,end)
            infinite;
        }


        @keyframes backdropIn {

          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }

        }

        .keypad-backdrop {
          animation:
            backdropIn
            100ms
            steps(3,end);
        }


        @keyframes keypadPop {

          0% {
            opacity: 0;

            transform:
              translateY(10px)
              scale(.96);
          }

          40% {
            opacity: 1;

            transform:
              translateY(-2px)
              scale(1.01);
          }

          70% {
            transform:
              translateY(1px)
              scale(.995);
          }

          100% {
            opacity: 1;

            transform:
              translateY(0)
              scale(1);
          }

        }

        .keypad-pop {
          animation:
            keypadPop
            170ms
            steps(5,end);
        }

      `}</style>

    </main>
  );
}

function PagerButton({
  label,
  aria,
  onClick,
}: {
  label: string;
  aria: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={aria}
      onClick={onClick}
      className="
        pager-button
        h-[clamp(44px,7vw,48px)]
        w-[clamp(52px,10vw,72px)]
        rounded-[6px]
        border-2 border-[#080808]
        bg-[#252623]
        font-mono
        text-[10px] font-bold
        text-[#a9aaa4]
        shadow-[inset_0_2px_1px_rgba(255,255,255,.1),0_4px_0_#090909]
      "
    >
      {label}
    </button>
  );
}