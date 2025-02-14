import { ActionButton } from "@follow/components/ui/button/index.js"
import { RootPortal } from "@follow/components/ui/portal/index.js"
import { Routes, views } from "@follow/constants"
import { useTypeScriptHappyCallback } from "@follow/hooks"
import { useRegisterGlobalContext } from "@follow/shared/bridge"
import { clamp, cn } from "@follow/utils/utils"
import { useWheel } from "@use-gesture/react"
import { AnimatePresence, m } from "framer-motion"
import { Lethargy } from "lethargy"
import type { FC, PropsWithChildren } from "react"
import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { isHotkeyPressed, useHotkeys } from "react-hotkeys-hook"

import { useRootContainerElement } from "~/atoms/dom"
import { useUISettingKey } from "~/atoms/settings/ui"
import { setFeedColumnShow, useFeedColumnShow, useSidebarActiveView } from "~/atoms/sidebar"
import { HotKeyScopeMap, isElectronBuild } from "~/constants"
import { shortcuts } from "~/constants/shortcuts"
import { useNavigateEntry } from "~/hooks/biz/useNavigateEntry"
import { useReduceMotion } from "~/hooks/biz/useReduceMotion"
import { getRouteParams } from "~/hooks/biz/useRouteParams"

import { WindowUnderBlur } from "../../components/ui/background"
import { getSelectedFeedIds, resetSelectedFeedIds, setSelectedFeedIds } from "./atom"
import { useShouldFreeUpSpace } from "./hook"
import { FeedList } from "./list"

const lethargy = new Lethargy()

const useBackHome = (active: number) => {
  const navigate = useNavigateEntry()

  return useCallback(
    (overvideActive?: number) => {
      navigate({
        feedId: null,
        entryId: null,
        view: overvideActive ?? active,
      })
    },
    [active, navigate],
  )
}

export function FeedColumn({ children, className }: PropsWithChildren<{ className?: string }>) {
  const carouselRef = useRef<HTMLDivElement>(null)

  const [active, setActive_] = useSidebarActiveView()

  const navigateBackHome = useBackHome(active)
  const setActive: typeof setActive_ = useCallback(
    (args) => {
      const nextActive = typeof args === "function" ? args(active) : args
      setActive_(args)

      navigateBackHome(nextActive)
      resetSelectedFeedIds()
    },
    [active, navigateBackHome, setActive_],
  )

  useLayoutEffect(() => {
    const { view } = getRouteParams()
    if (view !== undefined) {
      setActive_(view)
    }
  }, [setActive_])

  useWheel(
    ({ event, last, memo: wait = false, direction: [dx], delta: [dex] }) => {
      if (!last) {
        const s = lethargy.check(event)
        if (s) {
          if (!wait && Math.abs(dex) > 20) {
            setActive((i) => clamp(i + dx, 0, views.length - 1))
            return true
          } else {
            return
          }
        } else {
          return false
        }
      } else {
        return false
      }
    },
    {
      target: carouselRef,
    },
  )

  const [, setUseHotkeysSwitch] = useState<boolean>(false)
  useHotkeys(
    shortcuts.feeds.switchBetweenViews.key,
    (e) => {
      e.preventDefault()
      setUseHotkeysSwitch(true)
      if (isHotkeyPressed("Left")) {
        setActive((i) => {
          if (i === 0) {
            return views.length - 1
          } else {
            return i - 1
          }
        })
      } else {
        setActive((i) => (i + 1) % views.length)
      }
    },
    { scopes: HotKeyScopeMap.Home },
  )

  useRegisterGlobalContext("goToDiscover", () => {
    window.router.navigate(Routes.Discover)
  })

  const shouldFreeUpSpace = useShouldFreeUpSpace()
  const feedColumnShow = useFeedColumnShow()
  const rootContainerElement = useRootContainerElement()

  return (
    <WindowUnderBlur
      data-hide-in-print
      className={cn(
        "relative flex h-full flex-col space-y-3 pt-2.5",

        !feedColumnShow && isElectronBuild && "bg-zinc-200 dark:bg-neutral-800",
        className,
      )}
      onClick={useCallback(() => navigateBackHome(), [navigateBackHome])}
    >
      {!feedColumnShow && (
        <RootPortal to={rootContainerElement}>
          <ActionButton
            tooltip={"Toggle Feed Column"}
            className="center absolute top-2.5 z-0 hidden -translate-x-2 text-zinc-500 left-macos-traffic-light macos:flex"
            onClick={() => setFeedColumnShow(true)}
          >
            <i className="i-mgc-layout-leftbar-open-cute-re" />
          </ActionButton>
        </RootPortal>
      )}
      <div
        className={cn("relative flex size-full", !shouldFreeUpSpace && "overflow-hidden")}
        ref={carouselRef}
        onPointerDown={useTypeScriptHappyCallback((e) => {
          if (!(e.target instanceof HTMLElement) || !e.target.closest("[data-feed-id]")) {
            const nextSelectedFeedIds = getSelectedFeedIds()
            if (nextSelectedFeedIds.length === 0) {
              setSelectedFeedIds(nextSelectedFeedIds)
            } else {
              resetSelectedFeedIds()
            }
          }
        }, [])}
      >
        <SwipeWrapper active={active}>
          {views.map((item, index) => (
            <section key={item.name} className="h-full w-feed-col shrink-0 snap-center">
              <FeedList className="flex size-full flex-col text-sm" view={index} />
            </section>
          ))}
        </SwipeWrapper>
      </div>

      {children}
    </WindowUnderBlur>
  )
}

const SwipeWrapper: FC<{
  active: number
  children: React.JSX.Element[]
}> = ({ children, active }) => {
  const reduceMotion = useReduceMotion()

  const feedColumnWidth = useUISettingKey("feedColWidth")
  const containerRef = useRef<HTMLDivElement>(null)

  const prevActiveIndexRef = useRef(-1)
  const [isReady, setIsReady] = useState(false)

  const [direction, setDirection] = useState<"left" | "right">("right")
  const [currentAnimtedActive, setCurrentAnimatedActive] = useState(active)

  useLayoutEffect(() => {
    const prevActiveIndex = prevActiveIndexRef.current
    if (prevActiveIndex !== active) {
      if (prevActiveIndex < active) {
        setDirection("right")
      } else {
        setDirection("left")
      }
    }
    // eslint-disable-next-line @eslint-react/web-api/no-leaked-timeout
    setTimeout(() => {
      setCurrentAnimatedActive(active)
    }, 0)
    if (prevActiveIndexRef.current !== -1) {
      setIsReady(true)
    }
    prevActiveIndexRef.current = active
  }, [active])

  if (reduceMotion) {
    return <div ref={containerRef}>{children[currentAnimtedActive]}</div>
  }

  return (
    <AnimatePresence mode="popLayout">
      <m.div
        className="grow"
        key={currentAnimtedActive}
        initial={
          isReady
            ? {
                x: direction === "right" ? feedColumnWidth : -feedColumnWidth,
              }
            : true
        }
        animate={{ x: 0 }}
        exit={{
          x: direction === "right" ? -feedColumnWidth : feedColumnWidth,
        }}
        transition={{
          x: { type: "spring", stiffness: 700, damping: 40 },
        }}
        ref={containerRef}
      >
        {children[currentAnimtedActive]}
      </m.div>
    </AnimatePresence>
  )
}
