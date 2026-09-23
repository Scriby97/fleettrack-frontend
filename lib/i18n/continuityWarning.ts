import type { ApiError } from '@/lib/api/ApiError'

/**
 * Haengt bei Bedarf eine zweite Zeile an die primaere Kontinuitaets-
 * Fehlermeldung (USAGE_HOURS_GAP/USAGE_HOURS_OVERLAP) an - fuer den Fall,
 * dass sowohl der vorherige als auch der naechste Nachbar ein Problem zeigen
 * (siehe UsagesController.assertHoursContinuityOrThrow: params.secondaryCode/
 * secondaryHours). Nutzt denselben "errors"-Uebersetzungsnamespace fuer beide
 * Zeilen, keine zusaetzlichen Keys noetig. `tErrors` ist next-intl's
 * useTranslations('errors') - als `any` typisiert wie in useApiErrorMessage.ts,
 * da der Code hier nicht statisch als bekannter next-intl-Message-Key bekannt ist.
 */
export function appendSecondaryContinuityIssue(
  err: ApiError,
  primaryMessage: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tErrors: (key: any, params?: any) => string
): string {
  const secondaryCode = err.params?.secondaryCode
  const secondaryHours = err.params?.secondaryHours
  if (typeof secondaryCode === 'string' && typeof secondaryHours === 'number') {
    return `${primaryMessage}\n${tErrors(secondaryCode, { hours: secondaryHours })}`
  }
  return primaryMessage
}
