import type { FeedViewType } from "@follow/constants"
import { views } from "@follow/constants"
import { stopPropagation } from "@follow/utils/dom"
import { cn } from "@follow/utils/utils"
import { useQuery } from "@tanstack/react-query"
import { memo, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { useGeneralSettingSelector } from "~/atoms/settings/general"
import { FEED_COLLECTION_LIST } from "~/constants"
import { useNavigateEntry } from "~/hooks/biz/useNavigateEntry"
import { useRouteFeedId } from "~/hooks/biz/useRouteParams"
import { useAuthQuery } from "~/hooks/common"
import { Queries } from "~/queries"
import { useSubscriptionByView } from "~/store/subscription"
import { feedUnreadActions } from "~/store/unread"

import { feedColumnStyles } from "./styles"

export const useFeedsGroupedData = (view: FeedViewType) => {
  const { data: remoteData } = useAuthQuery(Queries.subscription.byView(view))

  const data = useSubscriptionByView(view) || remoteData

  const autoGroup = useGeneralSettingSelector((state) => state.autoGroup)

  return useMemo(() => {
    if (!data || data.length === 0) return {}

    const groupFolder = {} as Record<string, string[]>

    for (const subscription of data.filter((s) => !!s)) {
      const category =
        subscription.category || (autoGroup ? subscription.defaultCategory : subscription.feedId)

      if (category) {
        if (!groupFolder[category]) {
          groupFolder[category] = []
        }
        groupFolder[category].push(subscription.feedId)
      }
    }

    return groupFolder
  }, [autoGroup, data])
}

export const useListsGroupedData = (view: FeedViewType) => {
  const { data: remoteData } = useAuthQuery(Queries.subscription.byView(view))

  const data = useSubscriptionByView(view) || remoteData

  return useMemo(() => {
    if (!data || data.length === 0) return {}

    const lists = data.filter((s) => s && "listId" in s)

    const groupFolder = {} as Record<string, string[]>

    for (const subscription of lists.filter((s) => !!s)) {
      groupFolder[subscription.feedId] = [subscription.feedId]
    }

    return groupFolder
  }, [data])
}

export const useInboxesGroupedData = (view: FeedViewType) => {
  const { data: remoteData } = useAuthQuery(Queries.subscription.byView(view))

  const data = useSubscriptionByView(view) || remoteData

  return useMemo(() => {
    if (!data || data.length === 0) return {}

    const inboxes = data.filter((s) => s && "inboxId" in s)

    const groupFolder = {} as Record<string, string[]>

    for (const subscription of inboxes.filter((s) => !!s)) {
      if (!subscription.inboxId) continue
      groupFolder[subscription.inboxId] = [subscription.inboxId]
    }

    return groupFolder
  }, [data])
}

const useUpdateUnreadCount = () => {
  useAuthQuery(Queries.subscription.unreadAll(), {
    refetchInterval: false,
  })
}

export const ListHeader = ({ view }: { view: number }) => {
  const { t } = useTranslation()
  useUpdateUnreadCount()

  useQuery({
    queryKey: ["fetchUnreadByView", view],
    queryFn: () => feedUnreadActions.fetchUnreadByView(view),
    // 10 minute
    refetchInterval: 1000 * 60 * 10,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  })

  const navigateEntry = useNavigateEntry()

  return (
    <div onClick={stopPropagation} className="mx-3 flex items-center justify-between px-2.5 py-1">
      <div
        className="text-base font-bold"
        onClick={(e) => {
          e.stopPropagation()
          if (!document.hasFocus()) return
          if (view !== undefined) {
            navigateEntry({
              entryId: null,
              feedId: null,
              view,
            })
          }
        }}
      >
        {view !== undefined && t(views[view]!.name as any)}
      </div>
    </div>
  )
}

export const EmptyFeedList = memo(({ onClick }: { onClick?: (e: React.MouseEvent) => void }) => {
  const { t } = useTranslation()

  return (
    <div className="flex h-full flex-1 items-center font-normal text-zinc-500">
      <Link
        to="/discover"
        className="absolute inset-0 mt-[-3.75rem] flex h-full flex-1 cursor-menu flex-col items-center justify-center gap-2"
        onClick={(e) => {
          stopPropagation(e)
          onClick?.(e)
        }}
      >
        <i className="i-mgc-add-cute-re text-3xl" />
        <span className="text-base">{t("sidebar.add_more_feeds")}</span>
      </Link>
    </div>
  )
})
EmptyFeedList.displayName = "EmptyFeedList"

export const StarredItem = memo(({ view }: { view: number }) => {
  const feedId = useRouteFeedId()
  const navigateEntry = useNavigateEntry()
  const { t } = useTranslation()

  return (
    <div
      data-active={feedId === FEED_COLLECTION_LIST}
      className={cn(
        "mt-1 flex h-8 w-full shrink-0 cursor-menu items-center gap-2 rounded-md px-2.5",
        feedColumnStyles.item,
      )}
      onClick={(e) => {
        e.stopPropagation()
        if (view !== undefined) {
          navigateEntry({
            entryId: null,
            feedId: FEED_COLLECTION_LIST,
            view,
          })
        }
      }}
    >
      <i className="i-mgc-star-cute-fi size-4 -translate-y-px text-amber-500" />
      {t("words.starred")}
    </div>
  )
})
StarredItem.displayName = "StarredItem"
