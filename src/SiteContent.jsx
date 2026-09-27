import React from "react";

export default function SiteContent() {
  return (
    <>
      <div className="loader" id="loader">
        <div className="loader__inner">
          <div className="loader__glyph">写輪眼</div>

          <div className="loader__bar">
            <span id="loaderFill"></span>
          </div>

          <div className="loader__meta">
            <span>起動中 / INITIALIZING</span>

            <span id="loaderPct">00</span>
          </div>
        </div>
      </div>

      <div className="grain" aria-hidden="true"></div>

      <div className="vignette" aria-hidden="true"></div>

      <div className="scanlines" aria-hidden="true"></div>

      <div className="amaterasu-bed" aria-hidden="true"></div>

      <canvas
        className="amaterasu"
        id="amaterasuCanvas"
        aria-hidden="true"
      ></canvas>

      <div className="storm" aria-hidden="true">
        <div className="storm__flash" id="stormFlash"></div>

        <svg
          className="storm__bolt"
          id="stormBolt"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
        >
          <path
            id="boltPath"
            d=""
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          ></path>

          <path
            id="boltGlow"
            d=""
            fill="none"
            stroke="#9fd8ff"
            strokeWidth="9"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity=".45"
          ></path>
        </svg>
      </div>

      <div className="cursor" id="cursor" aria-hidden="true">
        <span></span>
      </div>

      <header className="chrome">
        <div className="chrome__mark">
          <svg viewBox="0 0 100 100" className="uchiwa" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            ></circle>

            <path
              d="M50 12 A38 38 0 0 1 50 88 A19 19 0 0 1 50 50 A19 19 0 0 0 50 12Z"
              fill="currentColor"
              opacity=".9"
            ></path>

            <circle cx="50" cy="31" r="6" fill="var(--ink)"></circle>

            <circle cx="50" cy="69" r="6" fill="currentColor"></circle>
          </svg>

          <span>UCHIHA</span>
        </div>

        <nav className="chrome__nav">
          <a href="#eyes" data-jp="眼">
            EYES
          </a>

          <a href="#jutsu" data-jp="術">
            JUTSU
          </a>

          <a href="#end" data-jp="終">
            END
          </a>

          <button
            className="chrome__sound"
            id="soundToggle"
            type="button"
            aria-pressed="false"
            title="雷鳴 / thunder audio"
          >
            <span className="chrome__sound-jp">音</span>

            <span id="soundState">
              OFF
            </span>
          </button>
        </nav>
      </header>

      <div className="rail rail--left" aria-hidden="true">
        <span>暁 · AKATSUKI · 木ノ葉隠れの里</span>
      </div>

      <div className="rail rail--right" aria-hidden="true">
        <span id="railScroll">SCROLL 000%</span>
      </div>

      <div className="hint" id="hint">
        <span className="hint__jp">下へ</span>

        <span className="hint__line"></span>

        <span className="hint__en">SCROLL TO OPEN HIS EYES</span>
      </div>

      <main>
        <section className="scrub" id="scrub">
          <div className="scrub__sticky">
            <canvas id="mainCanvas"></canvas>

            <div className="scrub__glow" id="scrubGlow"></div>

            <div className="phase">
              <h1 className="phase__jp">静寂</h1>

              <p className="phase__en">SILENCE</p>

              <p className="phase__sub">
                「一人で背負うと決めた。」 — He chose to carry it alone.
              </p>
            </div>

            <div className="phase">
              <h2 className="phase__jp">覚醒</h2>

              <p className="phase__en">AWAKENING</p>

              <p className="phase__sub">
                「本当の力は、目を開けた者にしか見えない。」
              </p>
            </div>

            <div className="phase">
              <h2 className="phase__jp">写輪眼</h2>

              <p className="phase__en">SHARINGAN</p>

              <p className="phase__sub">Three tomoe. Nothing escapes them.</p>
            </div>

            <div className="phase">
              <h2 className="phase__jp">烏</h2>

              <p className="phase__en">A THOUSAND CROWS</p>

              <p className="phase__sub">
                「幻術も、真実も、同じ羽で運ばれる。」
              </p>
            </div>

            <div className="titleblock" id="titleblock">
              <p className="titleblock__kicker">木ノ葉隠れの里 · 暁</p>

              <h1 className="titleblock__jp">
                うちは
                <span>イタチ</span>
              </h1>

              <p className="titleblock__en">U C H I H A   I T A C H I</p>
            </div>

            <canvas id="featherCanvas" className="feathers"></canvas>
          </div>
        </section>

        <section className="eyes" id="eyes">
          <div className="eyes__sticky">
            <canvas id="eyeCanvas"></canvas>

            <div className="eyes__flare" id="eyeFlare"></div>

            <div className="eyes__frame">
              <div className="eyes__label eyes__label--tl">万華鏡写輪眼</div>

              <div className="eyes__label eyes__label--tr">
                MANGEKYŌ · LIVE TRACK
              </div>

              <div className="eyes__label eyes__label--bl" id="eyeReadout">
                視線 左 00.0 / FRAME 00
              </div>

              <div className="eyes__label eyes__label--br">
                動かせ · MOVE YOUR CURSOR
              </div>
            </div>

            <div className="eyes__copy">
              <h2>
                見つめ
                <span>返せ</span>
              </h2>

              <p>彼はあなたを見ている。 — Wherever you move, he follows.</p>

              <p className="eyes__note">
                瞳孔追尾 · nine measured gaze positions, mapped left to right
              </p>
            </div>
          </div>
        </section>

        <section className="jutsu" id="jutsu">
          <div
            className="jutsu__reveal"
            aria-hidden="true"
          ></div>

          <div className="jutsu__rain" aria-hidden="true"></div>

          <canvas
            className="ghost"
            id="ghostCanvas"
            aria-hidden="true"
          ></canvas>

          <div className="jutsu__inner">
            <div className="jutsu__head">
              <span className="eyebrow" data-px="0.10">
                禁術 · FORBIDDEN ARTS
              </span>

              <h2 data-px="0.18">
                其の眼に
                <br />
                宿る術
              </h2>

              <p data-px="0.26">
                The techniques that lived behind those eyes — and the price each
                one demanded. He never used a single one of them for himself.
              </p>

              <div className="jutsu__meta" data-px="0.34">
                <span>
                  <i>血継限界</i>
                  KEKKEI GENKAI
                </span>

                <span>
                  <i>暁 · 潜入</i>
                  INFILTRATION
                </span>

                <span>
                  <i>四つの術</i>
                  FOUR ARTS
                </span>
              </div>

              <p className="jutsu__hint" data-px="0.40">
                動かせ · burn the dark away
              </p>
            </div>

            <div className="jutsu__grid">
              <article className="card">
                <span className="card__num">01 / GENJUTSU</span>
                <h3 className="card__jp">??</h3>
                <span className="card__ro">TSUKUYOMI</span>
                <p className="card__txt">
                  A moment becomes an eternity inside the world of his Mangeky?.
                  The victim feels every second.
                </p>
                <div className="card__foot">
                  <i>??????</i>  MENTAL WORLD
                </div>
              </article>

              <article className="card">
                <span className="card__num">02 / BLACK FLAME</span>
                <h3 className="card__jp">??</h3>
                <span className="card__ro">AMATERASU</span>
                <p className="card__txt">
                  Black flames ignite at the focal point of his gaze and
                  continue burning until their target is gone.
                </p>
                <div className="card__foot">
                  <i>??</i>  INEXTINGUISHABLE
                </div>
              </article>

              <article className="card">
                <span className="card__num">03 / SUSANOO</span>
                <h3 className="card__jp">????</h3>
                <span className="card__ro">SUSANOO</span>
                <p className="card__txt">
                  A spectral warrior formed around its wielder, carrying the
                  Yata Mirror and the Totsuka Blade.
                </p>
                <div className="card__foot">
                  <i>??</i>  SPIRITUAL AVATAR
                </div>
              </article>

              <article className="card">
                <span className="card__num">04 / SHURIKENJUTSU</span>
                <h3 className="card__jp">????</h3>
                <span className="card__ro">SHURIKENJUTSU</span>
                <p className="card__txt">
                  Precision and foresight turn even a thrown blade into part of
                  a carefully planned misdirection.
                </p>
                <div className="card__foot">
                  <i>??</i>  PERFECT CONTROL
                </div>
              </article>
            </div>

            <div className="jutsu__foot" data-px="0.14">
              <span>「命を賭して、里を守る。」</span>

              <span>TO PROTECT THE VILLAGE, HE GAVE UP BEING LOVED BY IT</span>
            </div>
          </div>

          <div className="jutsu__amaterasu" aria-hidden="true">
            <span className="jutsu__amaterasu-jp">天照</span>

            <span className="jutsu__amaterasu-ro">AMATERASU</span>

            <span className="jutsu__amaterasu-sub">
              黒炎 · 七日七夜 · 消えぬ火
            </span>
          </div>
        </section>

        <section className="quote">
          <div className="quote__jp">
            許せ、サスケ
            <span className="dots">…</span>
          </div>

          <blockquote>
            <p>
              “Those who cannot acknowledge their true selves are bound to fail.
              People live their lives bound by what they accept as correct and
              true — that's how they define reality.”
            </p>

            <cite>うちはイタチ · UCHIHA ITACHI</cite>
          </blockquote>

          <div className="quote__mark">これで最後だ</div>
        </section>

        <footer id="end">
          <div className="footer__big">木ノ葉の意志</div>

          <div className="footer__row">
            <span>WILL OF FIRE</span>

            <span>六月九日 — 三月二十五日</span>

            <span>「いつまでも、愛してるよ。」</span>
          </div>
        </footer>
      </main>

      <div className="sticky-badge">
        <span className="sticky-badge__jp">写輪眼</span>

        <span className="sticky-badge__en">SHARINGAN</span>
      </div>
    </>
  );
}

