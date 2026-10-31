"use client";

import { useEffect, useMemo, useState } from "react";
import { useOrganization } from "@/lib/contexts/OrganizationContext";
import { useDateLocale } from "@/lib/i18n/formatDate";
import { getApiBaseUrlOrNull } from "@/lib/api/url";
import { getOrganizationMembers } from "@/lib/api/organizationMembers";
import type { OrganizationMemberDetail } from "@/lib/types/user";

export interface CreatorFilter {
  /** Gewaehlter Erfasser; undefined = alle Personen der Organisation. */
  creatorId: string | undefined;
  setCreatorId: (creatorId: string) => void;
  options: { id: string; name: string }[];
  /** Auswahl nur fuer Admin/Owner und nur, wenn es mehrere Mitglieder gibt. */
  visible: boolean;
}

/**
 * Erfasser-Auswahl (nur Admin/Owner) fuer Nutzungslisten. Mitarbeiter sehen
 * ohnehin nur ihre eigenen Nutzungen. Die Auswahl gilt nur fuer die
 * Organisation, in der sie getroffen wurde - beim Organisationswechsel faellt
 * sie ohne zusaetzlichen Ladevorgang weg.
 */
export function useCreatorFilter(): CreatorFilter {
  const { selectedOrgId, canManageSelectedOrganization } = useOrganization();
  const dateLocale = useDateLocale();
  // Mitglieder samt Organisation, fuer die sie geladen wurden - veraltete
  // Listen (anderes Org) werden so ohne setState im Effect ignoriert.
  const [loaded, setLoaded] = useState<{
    orgId: string;
    members: OrganizationMemberDetail[];
  } | null>(null);
  const [filter, setFilter] = useState<{
    orgId: string;
    creatorId: string;
  } | null>(null);

  useEffect(() => {
    if (
      !canManageSelectedOrganization ||
      !selectedOrgId ||
      !getApiBaseUrlOrNull()
    )
      return;
    let cancelled = false;
    getOrganizationMembers(selectedOrgId)
      .then((list) => {
        if (!cancelled) setLoaded({ orgId: selectedOrgId, members: list });
      })
      .catch((err) => {
        console.error("Fehler beim Laden der Mitglieder:", err);
        if (!cancelled) setLoaded({ orgId: selectedOrgId, members: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [canManageSelectedOrganization, selectedOrgId]);

  const options = useMemo(() => {
    const members =
      canManageSelectedOrganization && loaded && loaded.orgId === selectedOrgId
        ? loaded.members
        : [];
    return members
      .map((m) => ({
        id: m.userId,
        name:
          [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") ||
          m.user.email,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, dateLocale));
  }, [canManageSelectedOrganization, loaded, selectedOrgId, dateLocale]);

  const creatorId =
    canManageSelectedOrganization && filter && filter.orgId === selectedOrgId
      ? filter.creatorId || undefined
      : undefined;

  return {
    creatorId,
    setCreatorId: (id: string) => {
      if (selectedOrgId) setFilter({ orgId: selectedOrgId, creatorId: id });
    },
    options,
    visible: canManageSelectedOrganization && options.length > 1,
  };
}
