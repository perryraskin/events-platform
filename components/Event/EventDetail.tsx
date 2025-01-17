import {
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  CogIcon,
  GlobeIcon,
  LocationMarkerIcon,
  LockClosedIcon,
  LockOpenIcon,
  MapIcon,
  OfficeBuildingIcon,
  PaperClipIcon,
  PencilAltIcon,
  QuestionMarkCircleIcon,
  StarIcon,
  UserAddIcon,
  UsersIcon,
  VideoCameraIcon,
  XCircleIcon,
  XIcon
} from "@heroicons/react/solid"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import dayjs from "dayjs"
import advancedFormat from "dayjs/plugin/advancedFormat"
import timezone from "dayjs/plugin/timezone"
import utc from "dayjs/plugin/utc"
import { NextPage } from "next"
import Link from "next/link"
import React, { useEffect, useState } from "react"
import S3 from "react-s3-uploader"
import { CalendarEvent } from "../../utilities/calendarUrls"
import AddToCalendar from "../Elements/AddToCalendar"
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(advancedFormat)

import { SignInButton, useUser } from "@clerk/nextjs"
import { ExclamationCircleIcon, PhotographIcon } from "@heroicons/react/outline"
import {
  ClerkUser,
  Event,
  EventAccess,
  Guest,
  GuestResponse
} from "../../models/interfaces"
import { classNames } from "../../utilities"
import AvatarGroupStack from "../AvatarGroupStack"
import DropdownWithIcons from "../DropdownWithIcons"
import { ClickableImage } from "../Elements/CickableImage"
import { spinner } from "../Elements/Icons"
import LocationSearch from "../Elements/LocationSearch"
import MapBox from "../MapBox"
import EventSettings from "../Modals/EventSettings"
import ShareSheet from "../Modals/ShareSheet"
import { claimEvent } from "./event.util"

interface Props {
  event: Event
  clerkUserMap: { [clerkUserId: string]: ClerkUser }
  inviteCode?: string
  refreshData: () => void
}

const EventDetail: NextPage<Props> = ({
  event,
  clerkUserMap,
  inviteCode,
  refreshData
}) => {
  const calendarAddress =
    (event?.Address[0]?.address1 ? event?.Address[0]?.address1 : "") +
    (event?.Address[0]?.address2 ? ", " + event?.Address[0]?.address2 : "") +
    (event?.Address[0]?.city ? ", " + event?.Address[0]?.city : "") +
    (event?.Address[0]?.state ? ", " + event?.Address[0]?.state : "") +
    (event?.Address[0]?.zip ? ", " + event?.Address[0]?.zip : "")
  const calendarEvent: CalendarEvent = {
    name: event?.title,
    details: event?.detailsText.replace(/\n/g, " "),
    location: event.locationUrl ? event.locationUrl : calendarAddress,
    startsAt: dayjs.utc(event?.dateTimeStart).format("YYYY-MM-DDTHH:mm:ssZ"),
    endsAt: dayjs.utc(event?.dateTimeEnd).format("YYYY-MM-DDTHH:mm:ssZ")
  }

  const tabs = [
    // "Design",
    "About"
    // "Comments"
  ]

  const { user, isSignedIn } = useUser()

  const [currentTab, setCurrentTab] = useState("About")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEventSettingsOpen, setIsEventSettingsOpen] = useState(false)
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [mapBoxReset, setMapBoxReset] = useState(true)

  const currentGuest = user
    ? event.Guests.find(guest => guest.clerkUserId === user.id)
    : null
  const [response, setResponse] = useState(currentGuest?.response)

  const [locationSearchOpen, setLocationSearchOpen] = React.useState(false)

  const editor = useEditor({
    extensions: [StarterKit],
    content: event.detailsHtml,
    editable: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none"
      }
    }
  })

  useEffect(() => {
    editor?.setEditable(isEditMode)
  }, [isEditMode])

  /* Event attributes for edit/update */
  const [title, setTitle] = useState(event.title)
  const [detailsHtml, setDetailsHtml] = useState(event.detailsHtml)
  const [detailsText, setDetailsText] = useState(event.detailsText)
  const [price, setPrice] = useState(event.price)
  const [imageUrl, setImageUrl] = useState(event.imageUrl)
  const [designImageUrl, setDesignImageUrl] = useState(event.designImageUrl)
  const [dateStart, setDateStart] = useState(
    event.dateTimeStart
      ? dayjs(event.dateTimeStart)
          .tz(event.timeZone)
          .format(`YYYY-MM-DD`)
      : null
  )
  const [timeStart, setTimeStart] = useState(
    event.dateTimeStart
      ? dayjs(event.dateTimeStart)
          .tz(event.timeZone)
          .format(`HH:mm`)
      : null
  )
  const [address2, setAddress2] = useState(event.Address[0]?.address2)
  const [eventAccess, setEventAccess] = useState(event.Settings?.access)
  const [eventTimeZone, setEventTimeZone] = useState(event.timeZone)

  const [dateStartView, setDateStartView] = useState(
    dayjs(event.dateTimeStart)
      .tz(event.timeZone)
      .format("dddd, MMMM D, YYYY")
  )
  const [timeStartView, setTimeStartView] = useState(
    dayjs(event.dateTimeStart)
      .tz(event.timeZone)
      .format("h:mm A")
  )
  const [adjustedTimeZone, setAdjustedTimeZone] = useState(event.timeZone)

  useEffect(() => {
    const localAdjustedTimeZone = localStorage.getItem(
      "inviteable.adjustedTimeZone"
    )
    if (localAdjustedTimeZone) {
      setAdjustedTimeZone(localAdjustedTimeZone)
    }
  }, [])
  useEffect(() => {
    const localAdjustedTimeZone = localStorage.getItem(
      "inviteable.adjustedTimeZone"
    )
    if (!localAdjustedTimeZone || localAdjustedTimeZone !== adjustedTimeZone) {
      localStorage.setItem("inviteable.adjustedTimeZone", adjustedTimeZone)
    }

    const convertedDateTime = dayjs(event.dateTimeStart).tz(adjustedTimeZone)
    setDateStartView(convertedDateTime.format("dddd, MMMM D, YYYY"))
    setTimeStartView(convertedDateTime.format("h:mm A"))
  }, [adjustedTimeZone, event])

  async function handleUpdateResponse(updatedResponse: GuestResponse) {
    setResponse(updatedResponse)
    let apiUrl = `/api/event/${event.id}`
    if (currentGuest) {
      apiUrl = `/api/guest/${currentGuest.id}`
    }
    fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        response: updatedResponse
      })
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          console.log(data)
          refreshData()
        }
      })
  }

  const hosts = event.Guests.filter((guest: Guest) => guest.isHost)
  const guests =
    event.id === 1
      ? demoGuests
      : event.Guests.filter((guest: Guest) => !guest.isHost)
  const guestsAccepted =
    event.id === 1
      ? demoGuests.filter(
          (guest: Guest) => guest.response === GuestResponse.Accepted
        )
      : event.Guests.filter(
          (guest: Guest) => guest.response === GuestResponse.Accepted
        )
  const guestsDeclined =
    event.id === 1
      ? demoGuests.filter(
          (guest: Guest) => guest.response === GuestResponse.Declined
        )
      : event.Guests.filter(
          (guest: Guest) => guest.response === GuestResponse.Declined
        )
  const guestsNotResponded = event.Guests.filter(
    (guest: Guest) => guest.response === GuestResponse.None
  )

  async function handleUpdateEvent() {
    setIsSubmitting(true)

    const res = await fetch(`/api/event/${event.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event: {
          title,
          detailsHtml,
          detailsText,
          price,
          dateTimeStart: `${dateStart} ${timeStart}`,
          // dateTimeStart: dayjs(`${dateStart} ${timeStart}`)
          //   .tz(eventTimeZone)
          //   .format(),
          address2,
          eventAccess,
          timeZone: eventTimeZone
        }
      })
    })
    const data = await res.json()
    if (!data.error) {
      setIsSubmitting(false)
      setIsEditMode(false)
      setAdjustedTimeZone(eventTimeZone)
      refreshData()
    }
  }
  const [bannerHover, setBannerHover] = useState(false)
  function handleClickFileInput(s3ElementId: string) {
    document.getElementById(s3ElementId).click()
  }

  async function handleUpdateImage(url) {
    setImageUrl(url)
    const res = await fetch(`/api/event/${event.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event: {
          imageUrl: url
        }
      })
    })
    const data = await res.json()
    if (!data.error) {
      console.log(data)
    }
  }

  async function handleUpdateDesignImage(url) {
    setDesignImageUrl(url)
    const res = await fetch(`/api/event/${event.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event: {
          designImageUrl: url
        }
      })
    })
    const data = await res.json()
    if (!data.error) {
      console.log(data)
    }
  }

  return (
    <>
      <LocationSearch
        open={locationSearchOpen}
        setOpen={setLocationSearchOpen}
        event={event}
        refreshData={refreshData}
        setMapBoxReset={setMapBoxReset}
      />
      <div className="text-center">
        <Link href="/events">
          <img
            className="mb-6 h-12 inline"
            src="https://res.cloudinary.com/raskin-me/image/upload/v1622141056/inviteable/inviteable-logo-2-alt-1_cpqw0x.png"
            alt="Inviteable"
          />
        </Link>
      </div>

      <main className="flex-1 rounded-xl shadow-lg relative z-0 overflow-y-auto focus:outline-none xl:order-last bg-white">
        <article>
          {/* Profile header */}
          <div>
            <div
              // onMouseOver={() => setBannerHover(true)}
              // onMouseLeave={() => setBannerHover(false)}
              className={classNames(
                "relative",
                currentGuest?.isHost
                  ? "hover:opacity-80 hover:cursor-pointer"
                  : ""
              )}
              onClick={() =>
                currentGuest?.isHost ? handleClickFileInput("s3-banner") : null
              }
            >
              <img
                className="h-32 w-full object-cover lg:h-48"
                src={
                  imageUrl ??
                  `https://res.cloudinary.com/raskin-me/image/upload/v1648753994/inviteable/banner-placeholder_cecqad.png`
                }
                alt=""
              />
              <div
                className={`s3-btn-wrapper absolute bottom-4 right-8 ${
                  currentGuest ? "hidden sm:block" : "hidden"
                }`}
              >
                <S3
                  accept="image/*"
                  multiple={false}
                  signingUrl={`/api/event/${event.id}/upload/banner/s3`}
                  signingUrlWithCredentials={true}
                  className="hidden"
                  id="s3-banner"
                  scrubFilename={name =>
                    Date.now() + "-" + name.replace(/[^\w\d_\-.]+/gi, "")
                  }
                  onFinish={e => handleUpdateImage(e["uploadUrl"])}
                  onError={e => alert(e)}
                />
                {isEditMode && (
                  <label htmlFor="s3-banner">
                    <button
                      type="button"
                      className="inline-flex justify-center px-4 py-2 border border-gray-300 
                    shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-200
                    focus:outline-none "
                      onClick={() => handleClickFileInput("s3-banner")}
                    >
                      <PhotographIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                      <span>Upload</span>
                    </button>
                  </label>
                )}
              </div>
            </div>
            <div className="absolute top-0 -gray-700"></div>
            <div className="max-w-5xl mx-auto px-4 sm:pl-6 lg:pl-8">
              <div className="-mt-12 sm:-mt-16 sm:flex sm:items-end sm:space-x-5">
                <div className="flex relative z-10">
                  <div
                    className="h-24 w-24 rounded-xl shadow-lg border-red-500 bg-white"
                    style={{ borderTopWidth: "26px" }}
                  >
                    <span
                      style={{ top: "2px" }}
                      className="text-white uppercase text-sm
                    font-bold absolute right-8 left-8"
                    >
                      {dayjs(dateStart).format("MMM")}
                    </span>
                    <span className="flex items-center justify-center h-16 font-semibold text-5xl">
                      {dateStart ? dayjs(dateStart).format("D") : "?"}
                    </span>
                  </div>
                </div>
                <div className="mt-6 sm:mt-14 sm:flex-1 sm:min-w-0 sm:flex sm:items-center sm:justify-end sm:space-x-6 sm:pb-1">
                  <div className="sm:hidden mt-6 min-w-0 flex-1">
                    <h3 className="text-sm font-bold uppercase text-red-500 truncate">
                      {dateStartView} at {timeStartView}
                    </h3>
                  </div>
                  <div className="sm:hidden mt-1 min-w-0 flex-1">
                    {isEditMode ? (
                      <input
                        type="text"
                        className="shadow-sm w-full focus:ring-none text-2xl font-bold focus:border-none sm:text-sm border-gray-300 rounded-md"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                      />
                    ) : (
                      <h1 className="text-2xl font-bold text-gray-900">
                        {event.title}
                      </h1>
                    )}
                  </div>
                  <div className="mt-6 flex flex-col justify-stretch space-y-3 sm:flex-row sm:space-y-0 sm:space-x-2">
                    {user &&
                      !isEditMode &&
                      (event.id === 1 ||
                        currentGuest ||
                        event.Settings.access === EventAccess.Public) && (
                        <DropdownWithIcons
                          title="Respond"
                          useSelectedOptionAsDefault={true}
                          currentValue={response}
                          handleChangeValue={handleUpdateResponse}
                          options={[
                            {
                              icon: (
                                <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                              ),
                              iconActive: (
                                <CheckCircleIcon className="-ml-1 mr-2 h-5 w-5 text-blue-500" />
                              ),
                              activeStyles:
                                "border-blue-300 text-blue-500 bg-blue-50",
                              label: "Going",
                              value: GuestResponse.Accepted
                            },
                            {
                              icon: (
                                <XCircleIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                              ),
                              iconActive: (
                                <XCircleIcon className="-ml-1 mr-2 h-5 w-5 text-red-500" />
                              ),
                              activeStyles:
                                "border-red-300 text-red-500 bg-red-50",
                              label: "Not Going",
                              value: GuestResponse.Declined
                            }
                          ]}
                        />
                      )}
                    {!user && event.clerkUserId && (
                      <Link
                        href={"/signin"}
                        className="inline-flex justify-center px-4 py-2 border border-gray-300 
                    shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 
                    focus:outline-none"
                      >
                        <span>Respond</span>
                      </Link>
                    )}
                    {event.clerkUserId && !isEditMode ? (
                      <button
                        type="button"
                        className="inline-flex justify-center px-4 py-2 border border-gray-300 
                    shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 
                    focus:outline-none"
                        onClick={() => setIsShareSheetOpen(true)}
                      >
                        <UserAddIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                        {/* {shareIcon("-ml-1 mr-2 h-5 w-5 text-gray-400")} */}
                        <span>Invite</span>
                      </button>
                    ) : !event.clerkUserId ? (
                      <>
                        {isSignedIn ? (
                          <a
                            role="button"
                            onClick={() => {
                              setIsSubmitting(true)
                              claimEvent(user.id, event.id)
                            }}
                            className="flex items-center justify-center px-4 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                          >
                            {spinner(isSubmitting)}
                            {!isSubmitting && (
                              <ExclamationCircleIcon
                                className="h-5 w-5 text-white mr-1"
                                aria-hidden="true"
                              />
                            )}
                            Claim this event to invite guests
                          </a>
                        ) : (
                          <SignInButton
                            redirectUrl={`${window.location.origin}/events/${event.id}?claim=true`}
                          >
                            <button
                              type="button"
                              className="flex items-center justify-center px-4 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                            >
                              {spinner(isSubmitting)}
                              {!isSubmitting && (
                                <ExclamationCircleIcon
                                  className="h-5 w-5 text-white mr-1"
                                  aria-hidden="true"
                                />
                              )}
                              Claim this event to invite guests
                            </button>
                          </SignInButton>
                        )}
                      </>
                    ) : null}
                    {!isEditMode && currentGuest?.isHost && (
                      <button
                        type="button"
                        className="inline-flex justify-center px-4 py-2 border border-gray-300 
                    shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 
                    focus:outline-none"
                        onClick={() => setIsEditMode(true)}
                      >
                        <PencilAltIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                        <span>Edit</span>
                      </button>
                    )}
                    {isEditMode && (
                      <>
                        <button
                          type="button"
                          className="inline-flex justify-center px-4 py-2 border  
                    shadow-sm text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 
                    border-blue-500 focus:outline-none"
                          onClick={handleUpdateEvent}
                        >
                          {!isSubmitting && (
                            <CheckIcon className="-ml-1 mr-2 h-5 w-5 text-white" />
                          )}
                          {spinner(isSubmitting)}
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          className="inline-flex justify-center px-4 py-2 border border-gray-300 
                    shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 
                    focus:outline-none"
                          onClick={() => setIsEditMode(false)}
                        >
                          <XIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                          <span>Cancel</span>
                        </button>
                      </>
                    )}
                    <AddToCalendar
                      event={calendarEvent}
                      isHost={currentGuest?.isHost}
                    />
                  </div>
                </div>
              </div>
              <div className="hidden sm:block mt-6 min-w-0 flex-1">
                <h3 className="text-sm font-bold uppercase text-red-500 truncate">
                  {dateStartView} at {timeStartView}
                </h3>
              </div>
              <div className="hidden sm:block mt-1 min-w-0 flex-1">
                {isEditMode ? (
                  <input
                    type="text"
                    className="shadow-sm w-full focus:ring-none focus:border-none text-2xl font-bold border-gray-300 rounded-md"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900">
                    {event.title}
                  </h1>
                )}
              </div>
            </div>
          </div>
          <EventSettings
            open={isEventSettingsOpen}
            setOpen={setIsEventSettingsOpen}
            event={event}
            guest={currentGuest}
            refreshData={refreshData}
          />
          <ShareSheet
            open={isShareSheetOpen}
            setOpen={setIsShareSheetOpen}
            eventTitle={event.title}
            // inviteUrl={`${window.location.origin}/events/${event.id}?inviteCode=${event.Invites[0]?.code}`}
            inviteUrl={`${window.location.origin}/invite/${event.Invites[0]?.code}`}
          />
          {/* Tabs */}
          <div className="mt-6 sm:mt-2 2xl:mt-5">
            <div className="border-b border-gray-200">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  {tabs.map(tab => (
                    <button
                      key={tab}
                      className={classNames(
                        "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                        tab === currentTab
                          ? "border-blue-500 text-gray-900"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      )}
                      onClick={() => setCurrentTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                  <button
                    className="border-transparent text-gray-500 hover:text-gray-700  
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm absolute right-2"
                    onClick={() => setIsEventSettingsOpen(true)}
                  >
                    {currentGuest?.isHost && (
                      <CogIcon className="mr-2 h-5 w-5 text-gray-400 inline hover:text-blue-500" />
                    )}
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {currentTab === "Design" ? (
            <>
              {/* CARD DESIGN */}
              {designImageUrl && (
                <ClickableImage
                  className="sm:mt-6 sm:w-[34rem] sm:px-6 lg:px-8"
                  src={designImageUrl}
                  title={event.title + " - Card Design"}
                />
              )}
              {currentGuest?.isHost && (
                <>
                  <S3
                    accept="image/*"
                    multiple={false}
                    signingUrl={`/api/event/${event.id}/upload/design/s3`}
                    signingUrlWithCredentials={true}
                    className="hidden"
                    id="s3-design"
                    scrubFilename={name =>
                      Date.now() + "-" + name.replace(/[^\w\d_\-.]+/gi, "")
                    }
                    onFinish={e => handleUpdateDesignImage(e["uploadUrl"])}
                    onError={e => alert(e)}
                  />
                  <div className="px-4 sm:px-6 lg:px-8">
                    <label htmlFor="s3-design">
                      <button
                        type="button"
                        className="inline-flex justify-center px-4 py-2 border border-gray-300 
                  shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-200
                  focus:outline-none w-full sm:w-auto"
                        onClick={() => handleClickFileInput("s3-design")}
                      >
                        <PhotographIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                        <span>Upload</span>
                      </button>
                    </label>
                  </div>
                </>
              )}
            </>
          ) : currentTab === "About" ? (
            <>
              {/* Details */}
              <div className="mt-8 max-w-5xl mx-auto px-4 pb-12 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="">
                    <div className="flex">
                      <div className="mr-3">
                        <UsersIcon className="mr-2 h-5 w-5 text-gray-400 inline" />
                        <span className="align-middle">
                          {guestsAccepted.length} going
                        </span>
                      </div>
                      <AvatarGroupStack
                        guestList={guestsAccepted}
                        clerkUserMap={clerkUserMap}
                      />
                    </div>
                    <p className="mt-2">
                      <StarIcon className="mr-2 h-5 w-5 text-gray-400 inline" />
                      <span className="align-middle">
                        Hosted by{" "}
                        <span className="font-semibold">
                          {clerkUserMap[event.clerkUserId]?.firstName}{" "}
                          {clerkUserMap[event.clerkUserId]?.lastName}
                        </span>
                      </span>
                    </p>
                    {event.locationUrl ? (
                      <p className="mt-2">
                        <VideoCameraIcon className="mr-2 h-5 w-5 text-gray-400 inline" />
                        <span className="align-middle font-semibold truncate">
                          {isEditMode ? (
                            <a
                              role="button"
                              className="text-blue-500 hover:underline"
                              onClick={() => setLocationSearchOpen(true)}
                            >
                              {event.locationUrl}
                            </a>
                          ) : (
                            <a
                              className="text-blue-500 hover:underline"
                              href={event.locationUrl}
                              target="_blank"
                            >
                              {
                                event.locationUrl
                                  .replace("http://", "")
                                  .replace("https://", "")
                                  .split("/")[0]
                              }
                            </a>
                          )}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-2">
                        <LocationMarkerIcon className="mr-2 h-5 w-5 text-gray-400 inline" />
                        {isEditMode ? (
                          <span className="align-middle">
                            <a
                              role="button"
                              className="text-blue-500 hover:underline"
                              onClick={() => setLocationSearchOpen(true)}
                            >
                              {event.Address[0].locationName
                                ? event.Address[0].locationName
                                : "Set location"}
                            </a>
                          </span>
                        ) : event.Address[0].locationName ? (
                          <span className="align-middle font-semibold">
                            {event.Address[0].locationName}
                          </span>
                        ) : null}
                      </p>
                    )}

                    {isEditMode ? (
                      <p className="mt-2">
                        <OfficeBuildingIcon className="mr-2 h-5 w-5 text-gray-400 inline" />
                        <span className="align-middle">
                          <input
                            type="text"
                            className="shadow-sm w-48 focus:ring-none focus:border-none sm:text-sm border-gray-300 rounded-md"
                            placeholder="Apt #, Suite #, etc."
                            value={address2 ?? ""}
                            onChange={e => setAddress2(e.target.value)}
                          />
                        </span>
                      </p>
                    ) : event.Address[0].address2 ? (
                      <p className="mt-2">
                        <OfficeBuildingIcon className="mr-2 h-5 w-5 text-gray-400 inline" />
                        <span className="align-middle">
                          {event.Address[0].address2}
                        </span>
                      </p>
                    ) : null}
                    <p className="mt-2">
                      <CalendarIcon className="mr-2 h-5 w-5 text-gray-400 inline" />
                      {isEditMode ? (
                        <span className="align-middle">
                          <input
                            type="date"
                            className="shadow-sm w-48 focus:ring-none focus:border-none sm:text-sm border-gray-300 rounded-md"
                            value={dateStart}
                            onChange={e => setDateStart(e.target.value)}
                          />
                        </span>
                      ) : (
                        <span className="align-middle">{dateStartView}</span>
                      )}
                    </p>
                    <p className="mt-2">
                      <ClockIcon className="mr-2 h-5 w-5 text-gray-400 inline" />
                      {isEditMode ? (
                        <span className="align-middle">
                          <input
                            type="time"
                            className="shadow-sm w-48 focus:ring-none focus:border-none sm:text-sm border-gray-300 rounded-md"
                            value={timeStart}
                            onChange={e => setTimeStart(e.target.value)}
                          />
                        </span>
                      ) : (
                        <span className="align-middle group relative cursor-default">
                          {timeStartView}
                          {/* <span className="absolute bottom-0 flex-col items-center hidden mb-6 group-hover:flex">
                        <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-black shadow-lg">
                          {dayjs.tz.guess()}
                        </span>
                        <span className="w-3 h-3 -mt-2 rotate-45 bg-black"></span>
                      </span> */}
                        </span>
                      )}
                    </p>

                    <p className="mt-2">
                      <MapIcon className="mr-2 h-5 w-5 text-gray-400 inline" />
                      {isEditMode ? (
                        <span className="align-middle">
                          {/* <select
                        className="mt-1 sm:w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none sm:text-sm rounded-md"
                        value={eventTimeZone}
                        onChange={e => setEventTimeZone(e.target.value)}
                      >
                        {Intl.supportedValuesOf("timeZone").map(tz => (
                          <option value={tz}>{tz}</option>
                        ))}
                      </select> */}
                          {event.timeZone}
                        </span>
                      ) : (
                        <span className="align-middle group relative cursor-default">
                          <select
                            className="mt-1 sm:w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none sm:text-sm rounded-md"
                            value={adjustedTimeZone}
                            onChange={e => setAdjustedTimeZone(e.target.value)}
                          >
                            {(Intl as any)
                              .supportedValuesOf("timeZone")
                              .map(tz => (
                                <option key={tz} value={tz}>
                                  {tz}
                                </option>
                              ))}
                          </select>
                          <span className="absolute bottom-2 flex-col items-center hidden mb-6 group-hover:flex">
                            <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-black shadow-lg">
                              Select preferred time zone:
                            </span>
                            <span className="w-3 h-3 -mt-2 rotate-45 bg-black"></span>
                          </span>
                        </span>
                      )}
                    </p>
                    {isEditMode ? (
                      <p className="mt-2">
                        {eventAccess === EventAccess.Private ? (
                          <LockClosedIcon className="mr-2 h-5 w-5 text-gray-400 inline" />
                        ) : eventAccess === EventAccess.Unlisted ? (
                          <LockOpenIcon className="mr-2 h-5 w-5 text-gray-400 inline" />
                        ) : (
                          <GlobeIcon className="mr-2 h-5 w-5 text-gray-400 inline" />
                        )}
                        <span className="align-middle">
                          <select
                            className="mt-1 w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none sm:text-sm rounded-md"
                            value={eventAccess.toString()}
                            onChange={e =>
                              setEventAccess(parseInt(e.target.value))
                            }
                          >
                            <option value={EventAccess.Private}>Private</option>
                            {/* <option  value={EventAccess.Unlisted}>Unlisted</option> */}
                            <option value={EventAccess.Public}>Public</option>
                          </select>
                        </span>
                      </p>
                    ) : eventAccess === EventAccess.Private ? (
                      <p className="mt-2">
                        <LockClosedIcon className="mr-2 h-5 w-5 text-gray-400 inline" />
                        <span className="align-middle">
                          Private{" "}
                          <span className="text-sm">(invited guests only)</span>
                        </span>
                      </p>
                    ) : (
                      <p className="mt-2">
                        <GlobeIcon className="mr-2 h-5 w-5 text-gray-400 inline" />
                        <span className="align-middle">Public </span>
                      </p>
                    )}
                    <S3
                      accept="image/*"
                      multiple={false}
                      signingUrl={`/api/event/${event.id}/upload/design/s3`}
                      signingUrlWithCredentials={true}
                      className="hidden"
                      id="s3-design"
                      scrubFilename={name =>
                        Date.now() + "-" + name.replace(/[^\w\d_\-.]+/gi, "")
                      }
                      onFinish={e => handleUpdateDesignImage(e["uploadUrl"])}
                      onError={e => alert(e)}
                    />
                    {designImageUrl ? (
                      <div className="mt-2 relative">
                        <PaperClipIcon className="hidden sm:inline mr-2 h-5 w-5 text-gray-400" />
                        {isEditMode ? (
                          <img
                            className="mt-2 sm:-mt-4 sm:w-96 sm:px-6 lg:px-8 cursor-pointer"
                            src={designImageUrl}
                            title={event.title + " (Design)"}
                            onClick={() => handleClickFileInput("s3-design")}
                          />
                        ) : (
                          <ClickableImage
                            className="mt-2 sm:-mt-4 sm:w-96 sm:px-6 lg:px-8"
                            src={designImageUrl}
                            title={event.title + " (Design)"}
                          />
                        )}
                      </div>
                    ) : currentGuest?.isHost ? (
                      <div className="mt-2 relative">
                        <PaperClipIcon className="hidden sm:inline mr-2 h-5 w-5 text-gray-400" />
                        <label htmlFor="s3-design">
                          <button
                            type="button"
                            className="text-sm font-medium text-gray-700 hover:underline"
                            onClick={() => handleClickFileInput("s3-design")}
                          >
                            <span>Upload design (e.g. from Canva)</span>
                          </button>
                        </label>
                      </div>
                    ) : null}
                  </div>
                  {!event.locationUrl && (
                    <div
                      id="map"
                      className="h-72 sm:h-full mt-2 sm:mt-0 rounded-lg relative shadow"
                    >
                      {/* <img
                  className="rounded-lg"
                  src="https://i.imgur.com/oFypSZG.jpg"
                   ></img> */}
                      {mapBoxReset && (
                        <MapBox
                          lat={event.Address[0].latitude}
                          long={event.Address[0].longitude}
                          zoom={13}
                        />
                      )}
                      <div
                        className="bg-white rounded-b-lg absolute bottom-0 z-10 w-full 
                    text-base sm:text-sm text-center font-sans font-semibold p-4 sm:p-3"
                      >
                        {event.Address[0].address1}
                        <br></br>
                        {event.Address[0].city
                          ? event.Address[0].city + ", "
                          : ""}
                        {event.Address[0].state}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-lg font-bold text-gray-900">Details</dt>
                    <dd
                      className={`mt-1 max-w-prose text-sm text-gray-900 space-y-5 ${
                        isEditMode ? "border p-2 rounded" : ""
                      }`}
                    >
                      <EditorContent
                        editor={editor}
                        onKeyUp={() => {
                          setDetailsText(editor.getText())
                          setDetailsHtml(editor.getHTML())
                        }}
                      />
                      {/* {isEditMode ? (
                    <EditorContent
                      editor={editor}
                      onChange={() => {
                        setDetailsText(editor.getText())
                        setDetailsHtml(editor.getHTML())
                      }}
                    />
                  ) : (
                    <div
                      dangerouslySetInnerHTML={{ __html: event.detailsHtml }}
                    ></div>
                  )} */}
                    </dd>
                  </div>
                </dl>
              </div>
            </>
          ) : null}

          {/* Host list */}
          {/* <div className="mt-8 max-w-5xl mx-auto px-4 pb-12 sm:px-6 lg:px-8">
            <h2 className="text-lg font-bold text-gray-900">Hosts</h2>
            <div className="mt-1 grid grid-cols-1 gap-4 sm:grid-cols-2"></div>
          </div> */}
          {/* Guest list */}
          <div className="mt-8 max-w-5xl mx-auto px-4 pb-12 sm:px-6 lg:px-8">
            <h2 className="text-lg font-bold text-gray-900">
              Guests ({event.Guests.length})
            </h2>
            {!event.Settings.showGuestList && currentGuest.isHost && (
              <p className="italic text-gray-500 text-sm font-medium">
                Guest list is only displayed to event hosts. You can change this
                in the event settings.
              </p>
            )}
            {(event.Settings.showGuestList || currentGuest?.isHost) && (
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {hosts.map((host: Guest) => (
                  <div
                    key={host.id}
                    className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3"
                  >
                    <div className="flex-shrink-0">
                      <img
                        className="h-10 w-10 rounded-full"
                        src={
                          clerkUserMap[host.clerkUserId]?.imageUrl ??
                          `https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkCLHRFbKUEWVuldDTj1d8aFG_RYfKlNHt1g&usqp=CAU`
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* <span className="absolute inset-0" aria-hidden="true" /> */}
                      <p className="text-base font-medium text-gray-900">
                        {clerkUserMap[host.clerkUserId]?.firstName}{" "}
                        {clerkUserMap[host.clerkUserId]?.lastName}
                      </p>
                      <StarIcon className="mr-1 h-5 w-5 text-indigo-700 inline" />
                      <span className="text-sm text-indigo-700 truncate font-medium align-middle">
                        Host
                      </span>
                    </div>
                    {/* <a
                    className=" cursor-pointer"
                    href={`mailto:${host.User?.email}`}
                  >
                    <MailIcon className="ml-1 h-6 w-6 text-gray-400 inline hover:text-indigo-700" />
                  </a> */}
                    {/* <a
                    className=" cursor-pointer"
                    href={`https://wa.me/${host.User?.phone}`}
                  >
                    <ChatIcon className="h-6 w-6 text-gray-400 inline hover:text-indigo-700" />
                  </a> */}
                  </div>
                ))}
                {guests.map((guest: Guest) => {
                  const guestResponse =
                    user && guest.clerkUserId === user.id
                      ? response
                      : guest.response
                  return (
                    <div
                      key={guest.id}
                      className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400"
                    >
                      <div className="flex-shrink-0">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={
                            clerkUserMap[guest.clerkUserId]?.imageUrl ??
                            `https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkCLHRFbKUEWVuldDTj1d8aFG_RYfKlNHt1g&usqp=CAU`
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <a href="#" className="focus:outline-none">
                          <span
                            className="absolute inset-0"
                            aria-hidden="true"
                          />
                          <p className="text-base font-medium text-gray-900">
                            {clerkUserMap[guest.clerkUserId]?.firstName}{" "}
                            {clerkUserMap[guest.clerkUserId]?.lastName}
                          </p>
                          {guestResponse === GuestResponse.Accepted ? (
                            <CheckCircleIcon className="mr-1 h-5 w-5 text-blue-500 inline" />
                          ) : guestResponse === GuestResponse.Declined ? (
                            <XCircleIcon className="mr-1 h-5 w-5 text-red-500 inline" />
                          ) : (
                            <QuestionMarkCircleIcon className="mr-1 h-5 w-5 text-gray-500 inline" />
                          )}

                          <span
                            className={`
                        text-sm truncate font-medium align-middle
                        ${
                          guestResponse === GuestResponse.Accepted
                            ? "text-blue-500"
                            : guestResponse === GuestResponse.Declined
                            ? "text-red-500"
                            : "text-gray-500"
                        }
                        `}
                          >
                            {guestResponse === GuestResponse.Accepted
                              ? "Going"
                              : guestResponse === GuestResponse.Declined
                              ? "Not Going"
                              : "No Response"}
                          </span>
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </article>
      </main>
    </>
  )
}

export default EventDetail

const demoGuests: Guest[] = [
  {
    id: 1,
    dateCreated: new Date(),
    User: {
      id: "1",
      firstName: "Michael",
      lastName: "Foster",
      imageUrl:
        "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixqx=Uz47TJ6CUV&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    },
    isHost: false,
    response: GuestResponse.Accepted
  },
  {
    id: 2,
    dateCreated: new Date(),
    User: {
      id: "2",
      firstName: "Dries",
      lastName: "Vincent",
      imageUrl:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&ixqx=Uz47TJ6CUV&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    },
    isHost: false,
    response: GuestResponse.Accepted
  },
  {
    id: 3,
    dateCreated: new Date(),
    User: {
      id: "3",
      firstName: "Lindsay",
      lastName: "Walton",
      imageUrl:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixqx=Uz47TJ6CUV&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    },
    isHost: false,
    response: GuestResponse.Declined
  },
  {
    id: 4,
    dateCreated: new Date(),
    User: {
      id: "4",
      firstName: "Esther",
      lastName: "Howard",
      imageUrl:
        "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=4&w=256&h=256&q=60"
    },
    isHost: false,
    response: GuestResponse.None
  }
]

function shareIconFilled(styles) {
  return (
    <svg
      className={styles}
      style={{
        // width: "1em",
        // height: "1em",
        // verticalAlign: "middle",
        // overflow: "hidden",
        fill: "currentColor"
      }}
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M204.8 1023.931733a204.8 204.8 0 0 1-204.8-204.8v-614.4a204.8 204.8 0 0 1 204.8-204.8h136.533333a68.266667 68.266667 0 1 1 0 136.533334H204.8a68.266667 68.266667 0 0 0-68.266667 68.266666v614.4a68.266667 68.266667 0 0 0 68.266667 68.266667h614.4a68.266667 68.266667 0 0 0 68.266667-68.266667v-136.533333a68.266667 68.266667 0 0 1 136.533333 0v136.533333a204.8 204.8 0 0 1-204.8 204.8z m88.2688-292.864a68.266667 68.266667 0 0 1 0-96.6656l497.8688-497.595733H614.4a68.266667 68.266667 0 0 1 0-136.533333h341.333333a68.266667 68.266667 0 0 1 68.266667 68.266666v341.333334a68.266667 68.266667 0 0 1-136.533333 0V233.198933l-497.8688 498.346667a68.744533 68.744533 0 0 1-96.529067 0z"
        fill="#8F9BB3"
      />
    </svg>
  )
}

function eventIcon(styles) {
  return (
    <svg
      className={styles}
      style={{
        fill: "currentColor"
      }}
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      x="0px"
      y="0px"
      viewBox="0 0 1000 1000"
      enableBackground="new 0 0 1000 1000"
      xmlSpace="preserve"
    >
      <metadata>Svg Vector Icons : http://www.onlinewebfonts.com/icon</metadata>
      <g>
        <g>
          <g>
            <path d="M385.7,643.2l-15.3,90.7c-2.1,12.4,3,24.9,13.2,32.3c10.2,7.4,23.7,8.4,34.8,2.6l81.6-42.6l81.6,42.6c4.8,2.5,10.1,3.8,15.3,3.8c6.9,0,13.7-2.2,19.5-6.3c10.2-7.4,15.3-19.9,13.2-32.3l-15.3-90.7l65.7-64.4c9-8.8,12.2-21.9,8.3-33.9c-3.9-11.9-14.2-20.7-26.7-22.5l-91-13.5l-41-82.4c-5.6-11.2-17.1-18.4-29.6-18.4c-12.5,0-24,7.1-29.7,18.4l-41,82.4l-91,13.5c-12.5,1.8-22.8,10.6-26.6,22.5c-3.9,11.9-0.7,25.1,8.3,33.9L385.7,643.2z" />
            <path d="M891.1,108.1H786.9V50.2c0-26.5-21.5-48-48-48h-7.6c-26.5,0-48,21.5-48,48v57.8H315.5V50.2c0-26.5-21.5-48-48-48h-7.6c-26.5,0-48,21.5-48,48v57.8h-103c-54.5,0-98.9,44.3-98.9,98.9v692c0,54.5,44.4,98.9,98.9,98.9h782.3c54.5,0,98.9-44.4,98.9-98.9v-692C990,152.4,945.6,108.1,891.1,108.1z M878.2,886H121.8V347.3h756.5V886z" />
          </g>
        </g>
        <g />
        <g />
        <g />
        <g />
        <g />
        <g />
        <g />
        <g />
        <g />
        <g />
        <g />
        <g />
        <g />
        <g />
        <g />
      </g>
    </svg>
  )
}
