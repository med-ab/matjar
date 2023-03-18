# Store Point of Sale
 Desktop Point of Sale app built with electron
 
  **Features:**

- Can be used by multiple PC's on a network with one central database.
- Receipt Printing.
- Search for product by barcode.
- Staff accounts and permissions. 
- Products and Categories.
- Basic Stock Management.
- Open Tabs (Orders).
- Customer Database. 
- Transaction History. 
- Filter Transactions by Till, Cashier or Status. 
- Filter Transactions by Date Range. 

The default username and password is  **admin**

**To Customize/Create your own installer**

```sh
git clone https://github.com/med-ab/matjar
cd matjar
npm install
npm run electron 
```
# todo
+ Make the 'confirmPayment' button change to hold if no payment is entered (and the status changes to 0)
- Fix paid value not resetting
- Add edition of confirmed sales