### Front end

To access the landing page, the user will be prompted with a login page;  a simple username and password input with a rest password option. When successfully logged in, the user will be redirected to the main page

The left menu will be a vertical starting just below the top bar; it will have the following:  
- on the very top the name/logo for the app
- immediately below a date range ( dd-mm-yy / dd-mm-yy ) that if clicked opens a date picker to select the date range
- on the very bottom a user menu ( showing the user name with a dropdown menu that when clicked will show a menu with the settings option and  logout )
- an accounts options that expands to show a list of all accounts avaialable; when an account is selected from the list, the main page will show:
 in the first row, the name of the account, account balance as per the end date of the date range, a settings button ( that will open a popover with the  account settings and a save/cancel button ), a transaction button (that will open a popover transaction page with the given account preselected and all the various inputs required and a save/cancel button ) and import button ( that will open a popover with the import inputs and a import/cancel button ) ; 
 in the second row two graphs taking the width of the page, showing one the percentage of target accounts by name and the other the percentage of transactions by type; finally in the last row, the transactions ( in a list ) paginated by 50 items at a time with an option to change the pagination to 50, 100, 200
    

- a user option that will open the user settings page showing all the users and their permission level.
    an icon next to each user will allow to edit ( will open a popover with the user details and an option to save/cancel ) or delete the user ( an alert dialog will request confirmation when deleting) 