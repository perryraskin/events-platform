import React, { Fragment, useState, useEffect } from "react"
import { NextPage } from "next"
import { Dialog, Transition } from "@headlessui/react"

interface Props {
  open: boolean
  setOpen: (open: boolean) => void
}

const ShareSheet: NextPage<Props> = ({ open, setOpen }) => {
  const eventUrl = "https://inviteable.app/event/1"

  function copy() {
    var copyText: HTMLInputElement = document.querySelector("#event_url")
    copyText.select()
    document.execCommand("copy")

    var copyButton = document.querySelector("#copy_btn")
    copyButton.innerHTML = "Copied!"
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        static
        className="fixed z-10 inset-0 overflow-y-auto"
        open={open}
        onClose={setOpen}
      >
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span
            className="hidden sm:inline-block sm:align-middle sm:h-screen"
            aria-hidden="true"
          >
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div
              className="sm:relative absolute top-16 inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left 
            overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6"
            >
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <Dialog.Title
                    as="h3"
                    className="text-lg leading-6 font-medium text-gray-900"
                  >
                    Invite guests
                  </Dialog.Title>
                  <div className="mt-4">
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <button
                        id="copy_btn"
                        onClick={copy}
                        className="inline-flex items-center px-3 rounded-l-md 
                      border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm focus:outline-none"
                      >
                        Copy
                      </button>
                      <input
                        type="text"
                        name="event_url"
                        id="event_url"
                        value={eventUrl}
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md focus:ring-white focus:border-gray-300 sm:text-sm border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  className="inline-flex justify-center w-full rounded-md border border-gray-300 
                  shadow-sm px-4 py-2 bg-white text-base font-medium 
                  text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

export default ShareSheet
