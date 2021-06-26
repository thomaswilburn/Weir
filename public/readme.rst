Weir UI
-------

A new UI for `Weir <https://github.com/thomaswilburn/Weir/>`_. Made of web components and spite.

Config
------

For simplicity's sake, configuration is simply a module located at `config.js` with a number of exported values:

* ``endpoint`` - the API base URL for the Weir server
* ``sanitizerBlocklist`` - an array of CSS selectors that should be removed during sanitization before displaying a story
* ``pingInterval`` - how often the story list should update unread counts from the server
* ``updateLimit`` - how many stories should be pulled/shown in the list at any time

Events
------

In addition to the DOM events used to communicate between parent and child components, modules may use a global event bus to distribute commands more widely. Event bus events are namespaced roughly by subject area (e.g., ``connection:*`` for events related to auth and connection status).

* ``connection:error`` - lets UI components know that an unexpected API error has occurred
* ``connection:established`` - issued when the ``<connection-status>`` component successfully authorizes, so that other components can update from the server.
* ``connection:totp-challenge`` - issued by the API module when a request is rejected. The get/post method will also throw, which can be handled or ignored.
* ``reader:open-tab`` - open the current story in a new tab
* ``reader:render`` - issued by the story list when the user picks a story to read, so that the renderer component can display it.
* ``reader:share`` - send the current story URL to the Share API
* ``stream:counts`` - issued by the story list when there's an update in the unread/total table on the server.
* ``stream:loading`` - status event at the start of a story refresh, for UI purposes
* ``stream:refresh`` - ask the story list to get unread stories
* ``stream:mark-all`` - ask the story list to mark the current set as read and refresh
* ``toast:alert`` - show a toast message, with the second parameter setting its duration
* ``toast:error`` - show a toast with error styling
* ``view:*`` - ask the specified panel or UI element to scroll itself into view
