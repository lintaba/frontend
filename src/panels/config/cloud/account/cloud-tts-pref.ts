import "@material/mwc-button";
import "@material/mwc-select";
import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../../../../common/string/compare";
import "../../../../components/ha-card";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-switch";
import {
  CloudStatusLoggedIn,
  CloudTTSInfo,
  getCloudTTSInfo,
  updateCloudPref,
} from "../../../../data/cloud";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import { translationMetadata } from "../../../../resources/translations-metadata";
import type { HomeAssistant } from "../../../../types";
import { showTryTtsDialog } from "./show-dialog-cloud-tts-try";

@customElement("cloud-tts-pref")
export class CloudTTSPref extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public cloudStatus?: CloudStatusLoggedIn;

  @state() private savingPreferences = false;

  @state() private ttsInfo?: CloudTTSInfo;

  protected render(): TemplateResult {
    if (!this.cloudStatus || !this.ttsInfo) {
      return html``;
    }

    const languages = this.getLanguages(this.ttsInfo);
    const defaultVoice = this.cloudStatus.prefs.tts_default_voice;
    const genders = this.getSupportedGenders(defaultVoice[0], this.ttsInfo);

    return html`
      <ha-card
        header=${this.hass.localize("ui.panel.config.cloud.account.tts.title")}
      >
        <div class="card-content">
          ${this.hass.localize(
            "ui.panel.config.cloud.account.tts.info",
            "service",
            '"tts.cloud_say"'
          )}
          <br /><br />

          <mwc-select
            .label=${this.hass.localize(
              "ui.panel.config.cloud.account.tts.default_language"
            )}
            .disabled=${this.savingPreferences}
            .value=${defaultVoice[0]}
            @selected=${this._handleLanguageChange}
          >
            ${languages.map(
              ([key, label]) =>
                html`<mwc-list-item .value=${key}>${label}</mwc-list-item>`
            )}
          </mwc-select>

          <mwc-select
            .label=${this.hass.localize(
              "ui.panel.config.cloud.account.tts.default_gender"
            )}
            .disabled=${this.savingPreferences}
            .value=${defaultVoice[1]}
            @selected=${this._handleGenderChange}
          >
            ${genders.map(
              ([key, label]) =>
                html`<mwc-list-item .value=${key}>${label}</mwc-list-item>`
            )}
          </mwc-select>
        </div>
        <div class="card-actions">
          <mwc-button @click=${this._openTryDialog}>
            ${this.hass.localize("ui.panel.config.cloud.account.tts.try")}
          </mwc-button>
        </div>
      </ha-card>
    `;
  }

  protected willUpdate(changedProps) {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      getCloudTTSInfo(this.hass).then((info) => {
        this.ttsInfo = info;
      });
    }
    if (changedProps.has("cloudStatus")) {
      this.savingPreferences = false;
    }
  }

  private getLanguages = memoizeOne((info?: CloudTTSInfo) => {
    const languages: Array<[string, string]> = [];

    if (!info) {
      return languages;
    }

    const seen = new Set<string>();
    for (const [lang] of info.languages) {
      if (seen.has(lang)) {
        continue;
      }
      seen.add(lang);

      let label = lang;

      if (lang in translationMetadata.translations) {
        label = translationMetadata.translations[lang].nativeName;
      } else {
        const [langFamily, dialect] = lang.split("-");
        if (langFamily in translationMetadata.translations) {
          label = `${translationMetadata.translations[langFamily].nativeName}`;

          if (langFamily.toLowerCase() !== dialect.toLowerCase()) {
            label += ` (${dialect})`;
          }
        }
      }

      languages.push([lang, label]);
    }
    return languages.sort((a, b) => caseInsensitiveStringCompare(a[1], b[1]));
  });

  private getSupportedGenders = memoizeOne(
    (language: string, info?: CloudTTSInfo) => {
      const genders: Array<[string, string]> = [];

      if (!info) {
        return genders;
      }

      for (const [curLang, gender] of info.languages) {
        if (curLang === language) {
          genders.push([
            gender,
            this.hass.localize(`ui.panel.config.cloud.account.tts.${gender}`) ||
              gender,
          ]);
        }
      }

      return genders.sort((a, b) => caseInsensitiveStringCompare(a[1], b[1]));
    }
  );

  private _openTryDialog() {
    showTryTtsDialog(this, {
      defaultVoice: this.cloudStatus!.prefs.tts_default_voice,
    });
  }

  async _handleLanguageChange(ev) {
    if (ev.target.value === this.cloudStatus!.prefs.tts_default_voice[0]) {
      return;
    }
    this.savingPreferences = true;
    const language = ev.target.value;

    const curGender = this.cloudStatus!.prefs.tts_default_voice[1];
    const genders = this.getSupportedGenders(language, this.ttsInfo);
    const newGender = genders.find((item) => item[0] === curGender)
      ? curGender
      : genders[0][0];

    try {
      await updateCloudPref(this.hass, {
        tts_default_voice: [language, newGender],
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      this.savingPreferences = false;
      // eslint-disable-next-line no-console
      console.error(err);
      showAlertDialog(this, {
        text: `Unable to save default language. ${err}`,
        warning: true,
      });
    }
  }

  async _handleGenderChange(ev) {
    if (ev.target.value === this.cloudStatus!.prefs.tts_default_voice[1]) {
      return;
    }
    this.savingPreferences = true;
    const language = this.cloudStatus!.prefs.tts_default_voice[0];
    const gender = ev.target.value;

    try {
      await updateCloudPref(this.hass, {
        tts_default_voice: [language, gender],
      });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err: any) {
      this.savingPreferences = false;
      // eslint-disable-next-line no-console
      console.error(err);
      showAlertDialog(this, {
        text: `Unable to save default gender. ${err}`,
        warning: true,
      });
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      a {
        color: var(--primary-color);
      }
      .example {
        position: absolute;
        right: 16px;
        top: 16px;
      }
      :host([dir="rtl"]) .example {
        right: auto;
        left: 24px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-tts-pref": CloudTTSPref;
  }
}
