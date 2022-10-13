// internationalization
import localeEn from "../package.nls.json";

interface LocaleEntry {
    [key: string]: string;
}
const localeTabKey = <string>JSON.parse(<string>process.env.VSCODE_NLS_CONFIG).locale;
const localeTable = Object.assign(localeEn, ((<{ [key: string]: LocaleEntry }>{ })[localeTabKey] || {}));
export const localeString = (key: string): string => localeTable[key] || key;
