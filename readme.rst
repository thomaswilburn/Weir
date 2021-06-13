Weir
====

What is it?
-----------

Weir is a simple, self-hosted RSS reader written in Node. It is written
via the principle of *do the least amount necessary*, which means that
it works very well for my priorities. Your own mileage may vary.

What does it do?
----------------

I have a lot of feeds, but I read very few of them in depth, and I never
share or store any of them. My RSS workflow is almost exclusively
limited to skimming through a list of items, reading a few, marking
everything as read, and moving on. Weir is optimized for this workflow.
It's also intended to work equally well on mobile and desktop.

What doesn't it do?
-------------------

Weir is intentionally stripped down. It will (probably) never support
these features.

-  Retain extensive archives
-  Provide social features, like sharing or commenting
-  Filtering on tags or categories
-  Offline mode

Quirks
------

Since it has an intended userbase of 1, Weir has some personal oddities:

* Auth is through timed one-time passcode - when the server is set up, it will default to an "insecure" state and show the user a QR code for Google Authenticator and a matching hash to enter into the server config. Once completed, you don't need a username or password to access Weir, just a TOTP token.
* I wrote the server routing on my own when I was first learning Node, so it can be a little finicky but it's reliable enough.
* You can mark items as read, but there's no API endpoint to revert that. Just as in life, we can only move forward past our mistakes.

Requirements
------------

-  NodeJS
-  PostgreSQL

Installation Instructions
-------------------------

1. Clone this repository into a directory. It can be anywhere--Weir
   hosts its own server on a unique port, so it doesn't need to be
   available to your Apache or Nginx installation.

2. Install Weir's dependencies using NPM. If you have Node installed,
   you should already have NPM, so navigate to the Weir directory and
   type the following command:

   ::

       npm install

3. Create a Postgres database, using the createdb command.

4. Copy the cfg-example.json file to cfg.json, and edit it to fill in
   your database information (type should be "postgres"), as well as
   some other configuration options. I recommend having an
   updateInterval of 15 (it's in minutes) and a expirationDate of 30
   (it's in days).

5. Kick off the Weir process with the following command, which will
   build the client-side files and start the HTTP server. Just leave it
   running--you may want to do this from a tmux window or as a bash job.

   ::

       npm start

6. Open a browser to the server/port combination where you're running
   Weir. For example, if my cfg.json set the port to 8080, I would visit
   "http://example.com:8080". Click the & icon on the right to open the
   options menu, and upload an OPML file to import your subscriptions
   (Google Takeout delivers this as "subscriptions.xml"). Then just
   start reading! It will take Weir a little time to pull all your
   subscriptions, but it'll be done by the amount of time you set in the
   configuration as updateInterval.

What's with the name?
---------------------

A weir is a type of dam intended to direct streams of water. They
prevent flooding and allow engineers to measure the flow of water, and
they are smaller than other dam types. Considering that this program is
intended to direct the flow of information with the minimum amount of
construction, it seemed appropriate.

Why Weir instead of other services?
-----------------------------------

If you're happy using a subscription or free service, go for it. In the
wake of the Reader shutdown, I'm personally wary about relying on other
people's servers.
