let log = console.log
let cart = []
let index = 0
let allUsers = []
let allProducts = []
let allCategories = []
let allTransactions = []
let sold = []
let state = []
let sold_items = []
let item
let auth
let holdOrder = 0
let vat = 0
let perms = null
let deleteId = 0
let paymentType = 0
let receipt = ''
let totalVat = 0
let subTotal = 0
let method = ''
let order_index = 0
let user_index = 0
let product_index = 0
let transaction_index
let host = 'localhost'
let path = require('path')
let port = '8001'
let moment = require('moment')
let Swal = require('sweetalert2')
let { ipcRenderer, dialog } = require('electron')
let dotInterval = setInterval(function () { $(".dot").text('.') }, 3000)
let Store = require('electron-store')
const remote = require('electron').remote
const app = remote.app
let img_path = app.getPath('appData') + '/POS/uploads/'
let api = 'http://' + host + ':' + port + '/api/'
let btoa = require('btoa')
let { jsPDF } = require('jspdf')
let html2canvas = require('html2canvas')
let JsBarcode = require('jsbarcode')
let macaddress = require('macaddress')
let categories = []
let holdOrderList = []
let customerOrderList = []
let ownUserEdit = null
let totalPrice = 0
let orderTotal = 0
let auth_error = 'Incorrect username or password'
let auth_empty = 'Please enter a username and password'
let holdOrderlocation = $("#renderHoldOrders")
let customerOrderLocation = $("#randerCustomerOrders")
let storage = new Store()
let settings
let platform
let user = {}
let start = moment().startOf('month')
let end = moment()
let start_date = moment(start).toDate()
let end_date = moment(end).toDate()
let by_till = 0
let by_user = 0
let by_status = undefined

let Alert = Swal.mixin({
        showClass: {
    popup: 'animate__animated animate__fadeIn animate__faster'
  },
  hideClass: {
    popup: 'animate__animated animate__fadeOut animate__faster'
  }
})


$("#updates").on('submit',function(event){
    event.preventDefault()
    $.ajax({
            type:'PATCH',
            url:api+'settings/version&'+$('#updates').serialize()
    })
    location.reload(true)
})

fetch(api+'settings/version').then(res=>res.json()).then(version=>{
    $('#current').html(version.current)
    if (version.updates.length == 0) return
    else {
        log(version)
        $('#updates').prepend(/*xml*/`
        <div class="input-group-btn">
        <div class="btn-group">
        <button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown"><span class="update"></span> <span class="caret"></span>
        </button>
        <ul class="dropdown-menu">
         ${version.updates.map(o=>`<li style='padding:2%;cursor:pointer' onclick="$('[name=commands]').attr('type','hidden').val('merge ${o.commit}');$('#updates').submit()">${o.Date}</li>`).join('\n')}
        </ul>
      </div>
        </div>
          `)
        $('.update').html('UPDATE')


    }
})


$(function () {

    function cb(start, end) {
        $('#reportrange span').html(start.format('MMMM D, YYYY') + '  -  ' + end.format('MMMM D, YYYY'))
    }

    $('#reportrange').daterangepicker({
        startDate: start,
        endDate: end,
        autoApply: true,
        timePicker: true,
        timePicker24Hour: true,
        timePickerIncrement: 10,
        timePickerSeconds: true,
        // minDate: '',
        ranges: {
            'Today': [moment().startOf('day'), moment()],
            'Yesterday': [moment().subtract(1, 'days').startOf('day'), moment().subtract(1, 'days').endOf('day')],
            'Last 7 Days': [moment().subtract(6, 'days').startOf('day'), moment().endOf('day')],
            'Last 30 Days': [moment().subtract(29, 'days').startOf('day'), moment().endOf('day')],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'This Month': [moment().startOf('month'), moment()],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        }
    }, cb)

    cb(start, end)

})


$.fn.serializeObject = function () {
    var o = {}
    var a = this.serializeArray()
    $.each(a, function () {
        if (o[this.name]) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]]
            }
            o[this.name].push(this.value || '')
        } else {
            o[this.name] = this.value || ''
        }
    })
    return o
}


auth = storage.get('auth')
user = storage.get('user')


if (auth == undefined) {
    $.get(api + 'users/check/', function (data) { })
    $("#loading").show()
    authenticate()

} else {

    $('#loading').show()

    setTimeout(function () {
        $('#loading').hide()
    }, 2000)

    platform = storage.get('settings')

    if (platform != undefined) {

        if (platform.app == 'Network Point of Sale Terminal') {
            api = 'http://' + platform.ip + ':' + port + '/api/'
            perms = true
        }
    }

    $.get(api + 'users/user/' + user._id, function (data) {
        user = data
        $('#loggedin-user').text(user.fullname)
    })


    $.get(api + 'settings/get', function (data) {
        settings = data.settings
    })


    $.get(api + 'users/all', function (users) {
        allUsers = [...users]
    })



    $(document).ready(function () {

        $(".loading").hide()

        loadCategories()
        loadProducts()
        loadCustomers()


        if (settings && settings.symbol) {
            $(".payment_curr").text(settings.symbol)
        }


        setTimeout(function () {
            if (settings == undefined && auth != undefined) {
                $('#settingsModal').modal('show')
            }
            else {
                vat = Number(settings.percentage)
                $("#taxInfo").text(settings.charge_tax ? vat : 0)
            }

        }, 1500)



        $("#settingsModal").on("hide.bs.modal", function () {

            setTimeout(function () {
                if (settings == undefined && auth != undefined) {
                    $('#settingsModal').modal('show')
                }
            }, 1000)

        })


        if (0 == user.perm_products) { $(".p_one").hide() }
        if (0 == user.perm_categories) { $(".p_two").hide() }
        if (0 == user.perm_transactions) { $(".p_three").hide() }
        if (0 == user.perm_users) { $(".p_four").hide() }
        if (0 == user.perm_settings) { $(".p_five").hide() }

        function loadProducts() {

            $.get(api + 'inventory/products', function (data) {

                allProducts = [...data]

                loadProductList()

                $('#parent').text('')
                $('#categories').html(`<button type="button" id="all" class="btn btn-categories btn-white waves-effect waves-light">All</button> `)

                data.forEach(item => {

                    if (!categories.includes(item.category)) {
                        categories.push(item.category)
                    }

                    let item_info = `<div class="col-lg-2 box ${item.category}"
                                onclick="$(this).addToCart(${item._id}, ${item.quantity}, ${item.stock})">
                            <div class="widget-panel widget-style-2 ">                    
                            <div id=image><img src="${item.img == "" ? "./assets/images/default.jpg" : img_path + item.img}" id="product_img" alt=""></div>                    
                                        <div class="text-muted m-t-5 text-center">
                                        <div class="name" id="product_name"><span class='badge count' style=background:lightgrey>${item.stock == 1 ? item.quantity : 'N/A'}</span>  ${item.name}</div>
                                        <b data-plugin="counterup" class="text-default text-center">${item.price + settings.symbol}</b>
                            </div>
                        </div>`
                    $('#parent').append(item_info)
                })

                categories.forEach(category =>
                    $('#categories').append(`<button type="button" id="${category}" class="btn btn-categories btn-white waves-effect waves-light">${allCategories.filter(ctg => ctg._id == category)[0].name}</button>`)
                )

            })

        }

        function loadCategories() {
            $.get(api + 'categories/all', function (data) {
                allCategories = data
                loadCategoryList()
                $('#category').html(`<option value="0">Select</option>`)
                allCategories.forEach(category => {
                    $('#category').append(`<option value="${category._id}">${category.name}</option>`)
                })
            })
        }


        function loadCustomers() {

            $.get(api + 'customers/all', function (customers) {

                $('#customer').html(`<option value=0 selected>Walk in customer</option>`)

                customers.forEach(cust => {

                    let customer = `<option value='{"id": ${cust._id}, "name": "${cust.name}"}'>${cust.name}</option>`
                    $('#customer').append(customer)
                })

                //  $('#customer').chosen()

            })

        }


        $.fn.addToCart = function (id, count, stock) {

            if (stock == 1) {
                if (count > 0) {
                    $.get(api + 'inventory/product/' + id, function (data) {
                        $(this).addProductToCart(data)
                    })
                }
                else {
                    new Alert(
                        'Out of stock!',
                        'This item is currently unavailable',
                        'info'
                    )
                }
            }
            else {
                $.get(api + 'inventory/product/' + id, function (data) {
                    $(this).addProductToCart(data)
                })
            }

        }


        function barcodeSearch(e) {

            e.preventDefault()
            $("#basic-addon2").empty()
            $("#basic-addon2").append(
                $('<i>', { class: 'fa fa-spinner fa-spin' })
            )

            let req = {
                skuCode: $("#skuCode").val()
            }

            $.ajax({
                url: api + 'inventory/product/sku',
                type: 'POST',
                data: JSON.stringify(req),
                contentType: 'application/json; charset=utf-8',
                cache: false,
                processData: false,
                success: function (data) {

                    if (data._id != undefined && data.quantity >= 1) {
                        $(this).addProductToCart(data)
                        $("#searchBarCode").get(0).reset()
                        $("#basic-addon2").empty()
                        $("#basic-addon2").append(
                            $('<i>', { class: 'fa fa-barcode' })
                        )
                    }
                    else if (data.quantity < 1) {
                        new Alert(
                            'Out of stock!',
                            'This item is currently unavailable',
                            'info'
                        )
                    }
                    else {

                        new Alert(
                            'Not Found!',
                            '<b>' + $("#skuCode").val() + '</b> is not a valid barcode!',
                            'warning'
                        )

                        $("#searchBarCode").get(0).reset()
                        $("#basic-addon2").empty()
                        $("#basic-addon2").append(
                            $('<i>', { class: 'fa fa-barcode' })
                        )
                    }

                }, error: function (data) {
                    if (data.status === 422) {
                        $(this).showValidationError(data)
                        $("#basic-addon2").append(
                            $('<i>', { class: 'glyphicon glyphicon-remove' })
                        )
                    }
                    else if (data.status === 404) {
                        $("#basic-addon2").empty()
                        $("#basic-addon2").append(
                            $('<i>', { class: 'glyphicon glyphicon-remove' })
                        )
                    }
                    else {
                        $(this).showServerError()
                        $("#basic-addon2").empty()
                        $("#basic-addon2").append(
                            $('<i>', { class: 'glyphicon glyphicon-warning-sign' })
                        )
                    }
                }
            })

        }


        $("#searchBarCode").on('submit', function (e) {
            barcodeSearch(e)
        })
        $('#switchBarcode').on('click', e => {
            $('#switchBarcode').toggleClass('active')
                $('#searchBarCode,#search').toggle()
        })

        $.fn.addProductToCart = function (data) {
            item = {
                id: data._id,
                product_name: data.name,
                sku: data.sku,
                price: data.price,
                quantity: 1
            }

            if ($(this).isExist(item)) {
                $(this).qtyIncrement(index)
            } else {
                cart.push(item)
                $(this).renderTable(cart)
            }
        }


        $.fn.isExist = function (data) {
            let toReturn = false
            $.each(cart, function (index, value) {
                if (value.id == data.id) {
                    $(this).setIndex(index)
                    toReturn = true
                }
            })
            return toReturn
        }


        $.fn.setIndex = function (value) {
            index = value
        }


        $.fn.calculateCart = function () {
            let total = 0
            let grossTotal
            $('#total').text(cart.length)
            $.each(cart, function (index, data) {
                total += data.quantity * data.price
            })
            $('#price').text(total + settings.symbol)

            subTotal = total

            if ($("#inputDiscount").val() >= total) {
                $("#inputDiscount").val(0)
            }

            if (settings.charge_tax) {
                totalVat = ((total * vat) / 100)
                grossTotal = total + totalVat - $("#inputDiscount").val()
            }

            else {
                grossTotal = total - $("#inputDiscount").val()
            }

            orderTotal = grossTotal

            $("#gross_price").text(grossTotal + settings.symbol)
            $("#payablePrice").val(grossTotal)
        }



        $.fn.renderTable = function (cartList) {
            $('#cartTable > tbody').empty()
            $(this).calculateCart()
            $.each(cartList, function (index, data) {
                $('#cartTable > tbody').append(
                    $('<tr>').append(
                        $('<td>', { text: index + 1 }),
                        $('<td>', { text: data.product_name }),
                        $('<td>').append(
                            $('<div>', { class: 'input-group' }).append(
                                $('<input>', {
                                    class: 'form-control',
                                    type: 'number',
                                    value: data.quantity,
                                    onInput: '$(this).qtyInput(' + index + ')'
                                })
                            )
                        ),
                        $('<td>', { text: (data.price * data.quantity) + settings.symbol }),
                        $('<td>').append(
                            $('<button>', {
                                class: 'btn btn-danger btn-xs',
                                onclick: '$(this).deleteFromCart(' + index + ')'
                            }).append(
                                $('<i>', { class: 'fa fa-times' })
                            )
                        )
                    )
                )
            })
        }


        $.fn.deleteFromCart = function (index) {
            cart.splice(index, 1)
            $(this).renderTable(cart)

        }


        $.fn.qtyIncrement = function (i) {

            item = cart[i]

            let product = allProducts.filter(function (selected) {
                return selected._id == parseInt(item.id)
            })

            if (product[0].stock == 1) {
                if (item.quantity < product[0].quantity) {
                    item.quantity += 1
                    $(this).renderTable(cart)
                }

                else {
                    new Alert(
                        'No more stock!',
                        'You have already added all the available stock.',
                        'info'
                    )
                }
            }
            else {
                item.quantity += 1
                $(this).renderTable(cart)
            }

        }


        $.fn.qtyDecrement = function (i) {
            if (item.quantity > 1) {
                item = cart[i]
                item.quantity -= 1
                $(this).renderTable(cart)
            }
        }


        $.fn.qtyInput = function (i) {
            item = cart[i]
            item.quantity = $(this).val()
            $(this).renderTable(cart)
        }


        $.fn.cancelOrder = function () {

            if (cart.length > 0) {
                new Alert({
                    title: 'Are you sure?',
                    text: "You are about to remove all items from the cart.",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#5fbeaa',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes, clear it!'
                }).then((result) => {

                    if (result.value) {

                        cart = []
                        $(this).renderTable(cart)
                        holdOrder = 0

                        new Alert(
                            'Cleared!',
                            'All items have been removed.',
                            'success'
                        )
                    }
                })
            }

        }


        $("#payButton").on('click', function () {
            if (cart.length != 0) {
                $("#paymentModal").modal('toggle')
            } else {
                new Alert(
                    'Oops!',
                    'There is nothing to pay!',
                    'warning'
                )
            }

        })


        $("#hold").on('click', function () {

            if (cart.length != 0) {

                $("#dueModal").modal('toggle')
            } else {
                new Alert(
                    'Oops!',
                    'There is nothing to hold!',
                    'warning'
                )
            }
        })


        function printJobComplete() {
            alert("print job complete")
        }


        $.fn.submitDueOrder = function (status) {

            let items = ""
            let payment = 0

            cart.forEach(item => {

                items += "<tr><td>" + item.product_name + "</td><td>" + item.quantity + "</td><td>" + Number(item.price) + settings.symbol + "</td></tr>"

            })

            let currentTime = new Date(moment())

            let discount = $("#inputDiscount").val()
            let customer = $("#customer").val()
            let date = moment(currentTime).format("YYYY-MM-DD HH:mm:ss")
            let paid = Number($("#payment").val()) + Number($('#paid').text())
            let change = $("#change").text() == '0' ? 0 : Number($("#change").text())
            let refNumber = $("#refNumber").val()
            let orderNumber = holdOrder
            let type = ""
            let tax_row = ""


            switch (paymentType) {

                case 1: type = "Cheque"
                    break

                case 2: type = "Card"
                    break

                default: type = "Cash"

            }


            if (paid != "") {
                payment = `<tr>
                        <td>Paid</td>
                        <td>:</td>
                        <td>${paid + settings.symbol}</td>
                    </tr>
                    <tr>
                        <td>Rest</td>
                        <td>:</td>
                        <td>${Math.abs(change) + settings.symbol}</td>
                    </tr>
                    <tr>
                        <td>Method</td>
                        <td>:</td>
                        <td>${type}</td>
                    </tr>`
            }



            if (settings.charge_tax) {
                tax_row = `<tr>
                    <td>Vat(${settings.percentage})% </td>
                    <td>:</td>
                    <td>${Number(totalVat)}${settings.symbol}</td>
                </tr>`
            }



            if (status == 0) {

                if (customer == 0 && $('#refNumber').val() == '') {
                    new Alert(
                        'Reference Required!',
                        'You either need to select a customer <br> or enter a reference!',
                        'warning' )
                    return
                }
            }


            $(".loading").show()


            if (holdOrder != 0) {

                orderNumber = holdOrder
                method = 'PUT'
            }
            else {
                orderNumber = Math.floor(Date.now() / 1000)
                method = 'POST'
            }


            receipt = `<div style="font-size: 10px;">                            
        <p style="text-align: center;">
        ${settings.img == "" ? settings.img : '<img style="max-width: 50px;max-width: 100px;" src ="' + img_path + settings.img + '" /><br>'}
            <span style="font-size: 22px;">${settings.store}</span> <br>
            ${settings.address_one} <br>
            ${settings.address_two} <br>
            ${settings.contact != '' ? 'Tel: ' + settings.contact + '<br>' : ''} 
            ${settings.tax != '' ? 'Vat No: ' + settings.tax + '<br>' : ''} 
        </p>
        <hr>
        <left>
            <p>
            Order No : ${orderNumber} <br>
            Customer : ${customer == 0 ? 'Walk in customer' : customer.name} <br>
            Cashier : ${user.fullname} <br>
            Date : ${date}<br>
            </p>

        </left>
        <hr>
        <table width="100%">
            <thead style="text-align: left;">
            <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
            </tr>
            </thead>
            <tbody>
            ${items}                
     
            <tr>                        
                <td><b>Subtotal</b></td>
                <td>:</td>
                <td><b>${subTotal}${settings.symbol}</b></td>
            </tr>
            <tr>
                <td>Discount</td>
                <td>:</td>
                <td>${discount > 0 ?  Number(discount) + settings.symbol : ''}</td>
            </tr>
            
            ${tax_row}
        
            <tr>
                <td><h3>Total</h3></td>
                <td><h3>:</h3></td>
                <td>
                    <h3>${Number(orderTotal)}${settings.symbol}</h3>
                </td>
            </tr>
            ${payment == 0 ? '' : payment}
            </tbody>
            </table>
            <br>
            <hr>
            <br>
            <p style="text-align: center;">
             ${settings.footer}
             </p>
            </div>`


            if (status == 3) {
                if (cart.length > 0) {

                    printJS({ printable: receipt, type: 'raw-html' })

                    $(".loading").hide()
                    return

                }
                else {

                    $(".loading").hide()
                    return
                }
            }


            let data = {
                order: orderNumber,
                ref_number: refNumber,
                discount,
                customer,
                status,
                subtotal: Number(subTotal),
                tax: totalVat,
                order_type: 1,
                items: cart,
                date: currentTime,
                payment_type: type,
                payment_info: $("#paymentInfo").val(),
                total: orderTotal,
                paid,
                change,
                _id: orderNumber,
                till: undefined,
                mac: undefined,
                user: user.fullname,
                user_id: user._id
            }


            $.ajax({
                url: api + 'new',
                type: method,
                data: JSON.stringify(data),
                contentType: 'application/json; charset=utf-8',
                cache: false,
                processData: false,
                success: function (data) {

                    cart = []
                    $('#viewTransaction').html('')
                    $('#viewTransaction').html(receipt)
                    $('#orderModal').modal('show')
                    loadProducts()
                    loadCustomers()
                    $(".loading").hide()
                    $("#dueModal").modal('hide')
                    $("#paymentModal").modal('hide')
                    $(this).getHoldOrders()
                    $(this).getCustomerOrders()
                    $(this).renderTable(cart)

                }, error: function (data) {
                    $(".loading").hide()
                    $("#dueModal").modal('toggle')
                    Alert("Something went wrong!", 'Please refresh this page and try again')

                }
            })

            $("#refNumber").val('')
            $("#change").text('0')
            $("#payment").val('')
            $('paid').val('0')

        }


        $.get(api + 'on-hold', function (data) {
            holdOrderList = data
            holdOrderlocation.empty()
            clearInterval(dotInterval)
            $(this).renderHoldOrders(holdOrderList, holdOrderlocation, 1)
        })


        $.fn.getHoldOrders = function () {
            $.get(api + 'on-hold', function (data) {
                holdOrderList = data
                clearInterval(dotInterval)
                holdOrderlocation.empty()
                $(this).renderHoldOrders(holdOrderList, holdOrderlocation, 1)
            })
        }


        $.fn.renderHoldOrders = function (data, renderLocation, orderType) {
            $.each(data, function (index, order) {
                $(this).calculatePrice(order)
                renderLocation.append(
                    $('<div>', { class: orderType == 1 ? 'col-md-3 order' : 'col-md-3 customer-order' }).append(
                        $('<a>').append(
                            $('<div>', { class: 'card-box order-box' }).append(
                                $('<p>').append(
                                    $('<b>', { text: 'Ref :' }),
                                    $('<span>', { text: order.ref_number, class: 'ref_number' }),
                                    $('<br>'),
                                    $('<b>', { text: 'Price :' }),
                                    $('<span>', { text: order.total, class: "label label-info", style: 'font-size:14px;' }),
                                    $('<br>'),
                                    $('<b>', { text: 'Items :' }),
                                    $('<span>', { text: order.items.length }),
                                    $('<br>'),
                                    $('<b>', { text: 'Customer :' }),
                                    $('<span>', { text: order.customer != 0 ? order.customer.name : 'Walk in customer', class: 'customer_name' })
                                ),
                                $('<button>', { class: 'btn btn-danger del', onclick: '$(this).deleteOrder(' + index + ',' + orderType + ')' }).append(
                                    $('<i>', { class: 'fa fa-trash' })
                                ),

                                $('<button>', { class: 'btn btn-default', onclick: '$(this).orderDetails(' + index + ',' + orderType + ')' }).append(
                                    $('<span>', { class: 'fa fa-shopping-basket' })
                                )
                            )
                        )
                    )
                )
            })
        }


        $.fn.calculatePrice = function (data) {
            totalPrice = 0
            $.each(data.products, function (index, product) {
                totalPrice += product.price * product.quantity
            })

            let vat = (totalPrice * data.vat) / 100
            totalPrice = ((totalPrice + vat) - data.discount).toFixed(0)

            return totalPrice
        }


        $.fn.orderDetails = function (index, orderType) {

            $('#refNumber').val('')

            if (orderType == 1) {

                $('#refNumber').val(holdOrderList[index].ref_number)
                $('#paid').text(holdOrderList[index].paid)
                $('#change').text(holdOrderList[index].change)
                
                $("#customer option:selected").removeAttr('selected')

                $("#customer option").filter(function () {
                    return $(this).text() == "Walk in customer"
                }).prop("selected", true)

                holdOrder = holdOrderList[index]._id
                cart = []
                $.each(holdOrderList[index].items, function (index, product) {
                    item = {
                        id: product.id,
                        product_name: product.product_name,
                        sku: product.sku,
                        price: product.price,
                        quantity: product.quantity
                    }
                    cart.push(item)
                })
            } else if (orderType == 2) {

                $('#refNumber').val('')
                $('#change').text(customerOrderList[index].change)

                $("#customer option:selected").removeAttr('selected')

                $("#customer option").filter(function () {
                    return $(this).text() == customerOrderList[index].customer.name
                }).prop("selected", true)


                holdOrder = customerOrderList[index]._id
                cart = []
                $.each(customerOrderList[index].items, function (index, product) {
                    item = {
                        id: product.id,
                        product_name: product.product_name,
                        sku: product.sku,
                        price: product.price,
                        quantity: product.quantity
                    }
                    cart.push(item)
                })
            }
            $(this).renderTable(cart)
            $("#holdOrdersModal").modal('hide')
            $("#customerModal").modal('hide')
        }


        $.fn.deleteOrder = function (index, type) {

            switch (type) {
                case 1: deleteId = holdOrderList[index]._id
                    break
                case 2: deleteId = customerOrderList[index]._id
            }

            let data = {
                orderId: deleteId,
            }

            new Alert({
                title: "Delete order?",
                text: "This will delete the order. Are you sure you want to delete!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#5fbeaa',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {

                if (result.value) {

                    $.ajax({
                        url: api + 'delete',
                        type: 'POST',
                        data: JSON.stringify(data),
                        contentType: 'application/json; charset=utf-8',
                        cache: false,
                        success: function (data) {

                            $(this).getHoldOrders()
                            $(this).getCustomerOrders()

                            new Alert(
                                'Deleted!',
                                'You have deleted the order!',
                                'success'
                            )

                        }, error: function (data) {
                            $(".loading").hide()

                        }
                    })
                }
            })
        }



        $.fn.getCustomerOrders = function () {
            $.get(api + 'customer-orders', function (data) {
                clearInterval(dotInterval)
                customerOrderList = data
                customerOrderLocation.empty()
                $(this).renderHoldOrders(customerOrderList, customerOrderLocation, 2)
            })
        }



        $('#saveCustomer').on('submit', function (e) {

            e.preventDefault()

            let custData = {
                _id: Math.floor(Date.now() / 1000),
                name: $('#userName').val(),
                phone: $('#phoneNumber').val(),
                email: $('#emailAddress').val(),
                address: $('#userAddress').val()
            }

            $.ajax({
                url: api + 'customers/customer',
                type: 'POST',
                data: JSON.stringify(custData),
                contentType: 'application/json; charset=utf-8',
                cache: false,
                processData: false,
                success: function (data) {
                    $("#newCustomer").modal('hide')
                    new Alert("Customer added!", "Customer added successfully!", "success")
                    $("#customer option:selected").removeAttr('selected')
                    $('#customer').append(
                        $('<option>', { text: custData.name, value: `{"id": ${custData._id}, "name": ${custData.name}}`, selected: 'selected' })
                    )

                    $('#customer').val(`{"id": ${custData._id}, "name": ${custData.name}}`).trigger('chosen:updated')

                }, error: function (data) {
                    $("#newCustomer").modal('hide')
                    new Alert('Error', 'Something went wrong please try again', 'error')
                }
            })
        })

        $("#cardInfo").hide()

        $("#payment").on('input', function () {
            if ($(this).val() > 0) {
                $('#confirmPayment').text('Confirm Payment').removeClass('btn-warning').addClass('btn-default')
            } else {
                $('#confirmPayment').text('Hold Order').removeClass('btn-default').addClass('btn-warning')
            }
            $(this).calculateChange()
        })


        $('#confirmPayment').on('click', function () {
            if (Number($('#change').text()) > 0 ) {
                $(this).submitDueOrder(0)
            }
            else {
                $(this).submitDueOrder(1)
            }
        })


        $('#transactions').click(function () {
            loadTransactions()
            loadUserList()

            $('#pos_view').hide()
            $('#pointofsale').show()
            $('#transactions_view').show()
            $(this).hide()

        })


        $('#pointofsale').click(function () {
            $('#pos_view').show()
            $('#transactions').show()
            $('#transactions_view').hide()
            $(this).hide()
        })


        $("#viewRefOrders").click(function () {
            setTimeout(function () {
                $("#holdOrderInput").focus()
            }, 1000)
        })


        $("#viewCustomerOrders").click(function () {
            setTimeout(function () {
                $("#holdCustomerOrderInput").focus()
            }, 1000)
        })


        $('#newProductModal').click(function () {
            $('#saveProduct').get(0).reset()
            $('#current_img').text('')
        })


        $('#saveProduct').submit(function (e) {
            e.preventDefault()

            $(this).attr('action', api + 'inventory/product')
            $(this).attr('method', 'POST')

            $(this).ajaxSubmit({
                contentType: 'application/json',
                success: function (response) {

                    $('#saveProduct').get(0).reset()
                    $('#current_img').text('')

                    loadProducts()
                    new Alert({
                        title: 'Product Saved',
                        text: "Select an option below to continue.",
                        icon: 'success',
                        showCancelButton: true,
                        confirmButtonColor: '#5fbeaa',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Add another',
                        cancelButtonText: 'Close'
                    }).then((result) => {

                        if (!result.value) {
                            $("#newProduct").modal('hide')
                        }
                    })
                }, error: function (data) {
                    console.log(data)
                }
            })

        })



        $('#saveCategory').submit(function (e) {
            e.preventDefault()

            if ($('#category_id').val() == "") {
                method = 'POST'
            }
            else {
                method = 'PUT'
            }

            $.ajax({
                type: method,
                url: api + 'categories/category',
                data: $(this).serialize(),
                success: function (data, textStatus, jqXHR) {
                    $('#saveCategory').get(0).reset()
                    loadCategories()
                    loadProducts()
                    new Alert({
                        title: 'Category Saved',
                        text: "Select an option below to continue.",
                        icon: 'success',
                        showCancelButton: true,
                        confirmButtonColor: '#5fbeaa',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Add another',
                        cancelButtonText: 'Close'
                    }).then((result) => {

                        if (!result.value) {
                            $("#newCategory").modal('hide')
                        }
                    })
                }, error: function (data) {
                    console.log(data)
                }

            })


        })


        $.fn.editProduct = function (index) {

            $('#Products').modal('hide')

            $("#category option").filter(function () {
                return $(this).val() == allProducts[index].category
            }).prop("selected", true)

            $('#productName').val(allProducts[index].name)
            $('#product_price').val(allProducts[index].price)
            $('#quantity').val(allProducts[index].quantity)

            $('#product_id').val(allProducts[index]._id)
            $('#img').val(allProducts[index].img)

            if (allProducts[index].img != "") {

                $('#imagename').hide()
                $('#current_img').html(`<img src="${img_path + allProducts[index].img}" alt="">`)
                $('#rmv_img').show()
            }

            if (allProducts[index].stock == 0) {
                $('#stock').prop("checked", true)
            }

            $('#newProduct').modal('show')
        }


        $("#userModal").on("hide.bs.modal", function () {
            $('.perms').hide()
        })


        $.fn.editUser = function (index) {

            user_index = index

            $('#Users').modal('hide')

            $('.perms').show()

            $("#user_id").val(allUsers[index]._id)
            $('#fullname').val(allUsers[index].fullname)
            $('#username').val(allUsers[index].username)
            $('#password').val(atob(allUsers[index].password))

            if (allUsers[index].perm_products == 1) {
                $('#perm_products').prop("checked", true)
            }
            else {
                $('#perm_products').prop("checked", false)
            }

            if (allUsers[index].perm_categories == 1) {
                $('#perm_categories').prop("checked", true)
            }
            else {
                $('#perm_categories').prop("checked", false)
            }

            if (allUsers[index].perm_transactions == 1) {
                $('#perm_transactions').prop("checked", true)
            }
            else {
                $('#perm_transactions').prop("checked", false)
            }

            if (allUsers[index].perm_users == 1) {
                $('#perm_users').prop("checked", true)
            }
            else {
                $('#perm_users').prop("checked", false)
            }

            if (allUsers[index].perm_settings == 1) {
                $('#perm_settings').prop("checked", true)
            }
            else {
                $('#perm_settings').prop("checked", false)
            }

            $('#userModal').modal('show')
        }


        $.fn.editCategory = function (index) {
            $('#Categories').modal('hide')
            $('#categoryName').val(allCategories[index].name)
            $('#category_id').val(allCategories[index]._id)
            $('#newCategory').modal('show')
        }


        $.fn.deleteProduct = function (id) {
            new Alert({
                title: 'Are you sure?',
                text: "You are about to delete this product.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#5fbeaa',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {

                if (result.value) {

                    $.ajax({
                        url: api + 'inventory/product/' + id,
                        type: 'DELETE',
                        success: function (result) {
                            loadProducts()
                            new Alert(
                                'Done!',
                                'Product deleted',
                                'success'
                            )

                        }
                    })
                }
            })
        }


        $.fn.deleteUser = function (id) {
            new Alert({
                title: 'Are you sure?',
                text: "You are about to delete this user.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#5fbeaa',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete!'
            }).then((result) => {

                if (result.value) {

                    $.ajax({
                        url: api + 'users/user/' + id,
                        type: 'DELETE',
                        success: function (result) {
                            loadUserList()
                            new Alert(
                                'Done!',
                                'User deleted',
                                'success'
                            )

                        }
                    })
                }
            })
        }


        $.fn.deleteCategory = function (id) {
            new Alert({
                title: 'Are you sure?',
                text: "You are about to delete this category.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#5fbeaa',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {

                if (result.value) {

                    $.ajax({
                        url: api + 'categories/category/' + id,
                        type: 'DELETE',
                        success: function (result) {
                            loadCategories()
                            new Alert(
                                'Done!',
                                'Category deleted',
                                'success'
                            )

                        }
                    })
                }
            })
        }


        $('#productModal').click(function () {
            loadProductList()
        })


        $('#usersModal').click(function () {
            loadUserList()
        })


        $('#categoryModal').click(function () {
            loadCategoryList()
        })


        function loadUserList() {

            let counter = 0
            let user_list = ''
            $('#user_list').empty()
            $('#userList').DataTable().destroy()

            $.get(api + 'users/all', function (users) {



                allUsers = [...users]

                users.forEach((user, index) => {

                    state = []
                    let class_name = ''

                    if (user.status != "") {
                        state = user.status.split("_")

                        switch (state[0]) {
                            case 'Logged In': class_name = 'btn-default'
                                break
                            case 'Logged Out': class_name = 'btn-light'
                                break
                        }
                    }

                    counter++
                    user_list += `<tr>
            <td>${user.fullname}</td>
            <td>${user.username}</td>
            <td class="${class_name}">${state.length > 0 ? state[0] : ''} <br><span style="font-size: 11px;"> ${state.length > 0 ? moment(state[1]).format('hh:mm A DD MMM YYYY') : ''}</span></td>
            <td>${user._id == 1 ? '<span class="btn-group"><button class="btn btn-dark"><i class="fa fa-pencil"></i></button><button class="btn btn-dark"><i class="fa fa-trash"></i></button></span>' : '<span class="btn-group"><button onClick="$(this).editUser(' + index + ')" class="btn btn-warning"><i class="fa fa-pencil"></i></button><button onClick="$(this).deleteUser(' + user._id + ')" class="btn btn-danger"><i class="fa fa-trash"></i></button></span>'}</td></tr>`

                    if (counter == users.length) {

                        $('#user_list').html(user_list)

                        $('#userList').DataTable({
                            "order": [[1, "desc"]]
                            , "autoWidth": false
                            , "info": true
                            , "JQueryUI": true
                            , "ordering": true
                            , "paging": false
                        })
                    }

                })

            })
        }


        function loadProductList() {
            let products = [...allProducts]
            let product_list = ''
            let counter = 0
            $('#product_list').empty()
            $('#productList').DataTable().destroy()

            products.forEach((product, index) => {

                counter++

                let category = allCategories.filter(category => category._id == product.category)


                product_list += `<tr>
            <td></td>
            <td><img id="`+ product._id + `"></td>
            <td><img style="max-height: 50px; max-width: 50px; border: 1px solid #ddd;" src="${product.img == "" ? "./assets/images/default.jpg" : img_path + product.img}" id="product_img"></td>
            <td>${product.name}</td>
            <td>${product.price}${settings.symbol}</td>
            <td>${product.stock == 1 ? product.quantity : 'N/A'}</td>
            <td>${category.length > 0 ? category[0].name : ''}</td>
            <td class="nobr"><span class="btn-group"><button onClick="$(this).editProduct(${index})" class="btn btn-warning btn-sm"><i class="fa fa-pencil"></i></button><button onClick="$(this).deleteProduct(${product._id})" class="btn btn-danger btn-sm"><i class="fa fa-trash"></i></button></span></td></tr>`

                if (counter == allProducts.length) {

                    $('#product_list').html(product_list)

                    products.forEach(pro => {
                        $("#" + pro._id + "").JsBarcode(pro._id, {
                            width: 2,
                            height: 25,
                            fontSize: 14
                        })
                    })

                    $('#productList input[name="check_all"]').on('change', function () { $(this).closest('table').find('input[type="checkbox"]:not(:disabled)').prop('checked', $(this).prop('checked')); })
                    let table = $('#productList').DataTable({
                        "order": [[1, "desc"]]
                        , "autoWidth": false
                        , "info": true
                        , "JQueryUI": true
                        , "ordering": true
                        , "paging": false
                        , "select": {
                            selector: 'td:first-child'
                        },
                        columnDefs: [{
                            orderable: false,
                            className: 'select-checkbox',
                            targets: 0,
                            data: null,
                            defaultContent: ''
                        }],
                        dom: 'Bfrtip',
                        "buttons": [
                            {
                                extend: 'selectAll',
                                text: '✔️'
                            },
                            {
                                extend: 'selectNone',
                                text: '&nbsp;&nbsp;&nbsp;'
                            },
                            {
                                extend: 'selected',
                                text: 'Download',
                                action:  () => {
				    $('body').css('cursor', 'progress')
                                    let Products = document.createElement('div')
                                    Products.id='products'
                                    Products.style.display ='flex'
                                    Products.style.flexWrap = 'wrap'
                                    Products.width='100%'
                                    table.rows({selected:true}).every(index=>{
                                        let product = Object.values(table.row(index).data())
                                        const [barcode,item,name,price,stock,category] = product,
                                            Product = {barcode,name,price}
                                        for (let i=0;i<Number(stock);i++){ Products.innerHTML+=
                                            `<div style='border:thin dashed grey;flex:0 1 20%;text-align:center;'>
                                            <h4 style=margin:0px><b>${Product.name}</b><br>${Product.price}</h4>
                                            ${Product.barcode}
                                            </div>`}
                                    })
                                    document.body.appendChild(Products)
                                    html2canvas($('#products')[0]).then(canvas => {
                                        var link = document.createElement("a")
                                        document.body.appendChild(link)
                                        link.download = "products.png"
                                        link.href = canvas.toDataURL()
                                        link.target = '_blank'
                                        link.click()
                                        console.log(document.querySelector('#products'))
                                        $('#products').remove()
                                    })
				    $('body').css('cursor', 'default')
                                }
                            }

                        ]
                    })
                }

            })
        }


        function loadCategoryList() {

            let category_list = ''
            let counter = 0
            $('#category_list').empty()
            $('#categoryList').DataTable().destroy()

            allCategories.forEach((category, index) => {

                counter++

                category_list += `<tr>
     
            <td>${category.name}</td>
            <td><span class="btn-group"><button onClick="$(this).editCategory(${index})" class="btn btn-warning"><i class="fa fa-pencil"></i></button><button onClick="$(this).deleteCategory(${category._id})" class="btn btn-danger"><i class="fa fa-trash"></i></button></span></td></tr>`
            })

            if (counter == allCategories.length) {

                $('#category_list').html(category_list)
                $('#categoryList').DataTable({
                    "autoWidth": false
                    , "info": true
                    , "JQueryUI": true
                    , "ordering": true
                    , "paging": false

                })
            }
        }


        $.fn.serializeObject = function () {
            var o = {}
            var a = this.serializeArray()
            $.each(a, function () {
                if (o[this.name]) {
                    if (!o[this.name].push) {
                        o[this.name] = [o[this.name]]
                    }
                    o[this.name].push(this.value || '')
                } else {
                    o[this.name] = this.value || ''
                }
            })
            return o
        }



        $('#log-out').click(function () {

            new Alert({
                title: 'Are you sure?',
                text: "You are about to log out.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#5fbeaa',
                confirmButtonText: 'Logout'
            }).then((result) => {

                if (result.value) {
                    $.get(api + 'users/logout/' + user._id, function (data) {
                        storage.delete('auth')
                        storage.delete('user')
                        ipcRenderer.send('app-reload', '')
                    })
                }
            })
        })



        $('#settings_form').on('submit', function (e) {
            e.preventDefault()
            let formData = $(this).serializeObject()
            let mac_address

            api = 'http://' + host + ':' + port + '/api/'

            macaddress.one(function (err, mac) {
                mac_address = mac
            })

            formData['app'] = $('#app').find('option:selected').text()
            formData['mac'] = mac_address
            formData['till'] = 1

            $('#settings_form').append('<input type="hidden" name="app" value="' + formData.app + '" />')

            if (formData.percentage != "" && !$.isNumeric(formData.percentage)) {
                new Alert(
                    'Oops!',
                    'Please make sure the tax value is a number',
                    'warning'
                )
            }
            else {
                storage.set('settings', formData)

                $(this).attr('action', api + 'settings/post')
                $(this).attr('method', 'POST')


                $(this).ajaxSubmit({
                    contentType: 'application/json',
                    success: function (response) {

                        ipcRenderer.send('app-reload', '')

                    }, error: function (data) {
                        console.log(data)
                    }

                })

            }

        })



        $('#net_settings_form').on('submit', function (e) {
            e.preventDefault()
            let formData = $(this).serializeObject()

            if (formData.till == 0 || formData.till == 1) {
                new Alert(
                    'Oops!',
                    'Please enter a number greater than 1.',
                    'warning'
                )
            }
            else {
                if (isNumeric(formData.till)) {
                    formData['app'] = $('#app').find('option:selected').text()
                    storage.set('settings', formData)
                    ipcRenderer.send('app-reload', '')
                }
                else {
                    new Alert(
                        'Oops!',
                        'Till number must be a number!',
                        'warning'
                    )
                }

            }

        })



        $('#saveUser').on('submit', function (e) {
            e.preventDefault()
            let formData = $(this).serializeObject()

            console.log(formData)

            if (ownUserEdit) {
                if (formData.password != atob(user.password)) {
                    if (formData.password != formData.pass) {
                        new Alert(
                            'Oops!',
                            'Passwords do not match!',
                            'warning'
                        )
                    }
                }
            }
            else {
                if (formData.password != atob(allUsers[user_index].password)) {
                    if (formData.password != formData.pass) {
                        new Alert(
                            'Oops!',
                            'Passwords do not match!',
                            'warning'
                        )
                    }
                }
            }



            if (formData.password == atob(user.password) || formData.password == atob(allUsers[user_index].password) || formData.password == formData.pass) {
                $.ajax({
                    url: api + 'users/post',
                    type: 'POST',
                    data: JSON.stringify(formData),
                    contentType: 'application/json; charset=utf-8',
                    cache: false,
                    processData: false,
                    success: function (data) {

                        if (ownUserEdit) {
                            ipcRenderer.send('app-reload', '')
                        }

                        else {
                            $('#userModal').modal('hide')

                            loadUserList()

                            $('#Users').modal('show')
                            new Alert(
                                'Ok!',
                                'User details saved!',
                                'success'
                            )
                        }


                    }, error: function (data) {
                        console.log(data)
                    }

                })

            }

        })



        $('#app').change(function () {
            if ($(this).find('option:selected').text() == 'Network Point of Sale Terminal') {
                $('#net_settings_form').show(500)
                $('#settings_form').hide(500)
                macaddress.one(function (err, mac) {
                    $("#mac").val(mac)
                })
            }
            else {
                $('#net_settings_form').hide(500)
                $('#settings_form').show(500)
            }

        })



        $('#cashier').click(function () {

            ownUserEdit = true

            $('#userModal').modal('show')

            $("#user_id").val(user._id)
            $("#fullname").val(user.fullname)
            $("#username").val(user.username)
            $("#password").val(atob(user.password))

        })



        $('#add-user').click(function () {


            $("#saveUser").get(0).reset()
            $('#userModal').modal('show')

        })



        $('#settings').click(function () {

                $('#net_settings_form').hide(500)
                $('#settings_form').show(500)

                $("#settings_id").val("1")
                $("#store").val(settings.store)
                $("#address_one").val(settings.address_one)
                $("#address_two").val(settings.address_two)
                $("#contact").val(settings.contact)
                $("#tax").val(settings.tax)
                $("#symbol").val(settings.symbol)
                $("#percentage").val(settings.percentage)
                $("#footer").val(settings.footer)
                $("#logo_img").val(settings.img)
                if (settings.charge_tax == 'on') {
                    $('#charge_tax').prop("checked", true)
                }
                if (settings.img != "") {
                    $('#logoname').hide()
                    $('#current_logo').html(`<img src="${img_path + settings.img}" alt="">`)
                    $('#rmv_logo').show()
                }

                $("#app option").filter(function () {
                    return $(this).text() == settings.app
                }).prop("selected", true)




        })


    })


    $('#rmv_logo').click(function () {
        $('#remove_logo').val("1")
        $('#current_logo').hide(500)
        $(this).hide(500)
        $('#logoname').show(500)
    })


    $('#rmv_img').click(function () {
        $('#remove_img').val("1")
        $('#current_img').hide(500)
        $(this).hide(500)
        $('#imagename').show(500)
    })



}


$.fn.print = function () {

    printJS({ printable: receipt, type: 'raw-html' })

}


function loadTransactions() {

    let tills = []
    let users = []
    let sales = 0
    let transact_ = 0
    let unique = 0

    sold_items = []
    sold = []

    let counter = 0
    let transaction_list = ''
    let query = `by-date?start=${start_date}&end=${end_date}&user=${by_user}${by_status ? `&status=${by_status}` : ``}&till=${by_till}`
    
    $.get(api + query, function (transactions) {

        if (transactions.length > 0) {


            $('#transaction_list').empty()
            $('#transactionList').DataTable().destroy()

            allTransactions = [...transactions]

            transactions.forEach((transact, index) => {

                sales += Number(transact.total)
                transact_++



                transact.items.forEach(item => {
                    sold_items.push(item)
                })


                if (!tills.includes(transact.till)) {
                    tills.push(transact.till)
                }

                if (!users.includes(transact.user_id)) {
                    users.push(transact.user_id)
                }

                counter++
                transaction_list += `<tr>
                                <td class=nobr>${moment(transact.date).format('YYYY MM DD hh:mm:ss')}</td>
                                <td>${transact.total + settings.symbol}</td>
                                <td>${transact.paid == '' ? '' :  transact.paid + settings.symbol}</td>
                                <td>${(transact.change ? Math.abs(transact.change) : 0) + settings.symbol}</td>
                                <td>${transact.paid == '' ? '' : transact.payment_type}</td>
                                <td>
                                   <button class='btn btn-sm btn-${transact.paid == `` ? `dark` : `light`}' onclick='$(this).viewTransaction(${index})'><i class='fa fa-align-left'></i></button>
                                   <button class='btn btn-sm btn-${transact.paid == `` ? `dark'` : `warning' onclick='$(this).editTransaction(${index})'`}><i class='fa fa-pencil'></i></button>
                                   <button class='btn btn-sm btn-danger' onclick='$.ajax({ url: "${api+transact._id}", type: "DELETE"}); location.reload(true);'><i class='fa fa-times'></i></button>
                                </td>
                                </tr>
                                `

                if (counter == transactions.length) {

                    $('#total_sales #counter').text(sales + settings.symbol)

                    const result = {}

                    for (const { product_name, price, quantity, id } of sold_items) {
                        if (!result[product_name]) result[product_name] = []
                        result[product_name].push({ id, price, quantity })
                    }

                    for (item in result) {

                        let price = 0
                        let quantity = 0
                        let id = 0

                        result[item].forEach(i => {
                            id = i.id
                            price = i.price
                            quantity += i.quantity
                        })

                        sold.push({
                            id: id,
                            product: item,
                            qty: quantity,
                            price: price
                        })
                    }

                    loadSoldProducts()


                    if (by_user == 0 && by_till == 0) {

                        userFilter(users)
                        tillFilter(tills)
                    }


                    $('#transaction_list').html(transaction_list)
                    $('#transactionList').DataTable({
                        "order": [[0, "desc"]]
                        , "info": true
                        , "JQueryUI": true
                        , "ordering": true
                        , "paging": true,
                        "dom": 'Bfrtip',
                        "buttons": ['csv', 'excel', 'pdf',]

                    })
                }
            })
        }
        else {
            new Alert(
                'No data!',
                'No transactions available within the selected criteria',
                'warning'
            )
        }

    })
}


function loadSoldProducts() {

    sold.sort((a, b) => a.qty > b.qty ? -1 : a.qty < b.qty ? 1 : 0)

    let counter = 0
    let sold_list = ''
    let items = 0
    let products = 0
    $('#product_sales').empty()

    sold.forEach((item, index) => {

        items += item.qty
        products++

        let product = allProducts.filter(function (selected) {
            return selected._id == item.id
        })

        counter++

        sold_list += `<tr>
            <td>${item.product}</td>
            <td>${item.qty}</td>
            <td>${product[0].stock == 1 ? product.length > 0 ? product[0].quantity : '' : 'N/A'}</td>
            <td>${(item.qty * Number(item.price)) + settings.symbol}</td>
            </tr>`

        if (counter == sold.length) {
            $('#total_items #counter').text(counter)
            $('#total_products #counter').text(products)
            $('#product_sales').html(sold_list)
        }
    })
}


function userFilter(users) {

    $('#users').empty()
    $('#users').append(`<option value="0">All</option>`)

    users.forEach(user => {
        let u = allUsers.filter(function (usr) {
            return usr._id == user
        })

        $('#users').append(`<option value="${user}">${u[0].fullname}</option>`)
    })

}


function tillFilter(tills) {

    $('#tills').empty()
    $('#tills').append(`<option value="0">All</option>`)
    tills.forEach(till => {
        $('#tills').append(`<option value="${till}">${till}</option>`)
    })

}

$.fn.editTransaction = (index) => {
    $('#pointofsale').click()
    transaction_index = index
    $('#refNumber').val(allTransactions[index].ref_number)
    $('#paid').text(allTransactions[index].paid)
    $('#change').text(allTransactions[index].change)
    $("#customer option:selected").removeAttr('selected')
    $("#customer option").filter(function () {
        return $(this).text() == allTransactions[index].customer.name
    }).prop("selected", true)
    holdOrder = allTransactions[index]._id
    cart = []
    $.each(allTransactions[index].items, function (index, product) {
        item = {
            id: product.id,
            product_name: product.product_name,
            sku: product.sku,
            price: product.price,
            quantity: product.quantity
        }
        cart.push(item)
    })
    $(this).renderTable(cart)
    $("#holdOrdersModal").modal('hide')
    $("#customerModal").modal('hide')
}
$.fn.viewTransaction = (index) => {

    transaction_index = index

    receipt = `<div style="font-size: 10px;">                            
        <p style="text-align: center;">
        ${settings.img == "" ? settings.img : '<img style="max-width: 50px;max-width: 100px;" src ="' + img_path + settings.img + '" /><br>'}
            <span style="font-size: 22px;">${settings.store}</span> <br>
            ${settings.address_one} <br>
            ${settings.address_two} <br>
            ${settings.contact != '' ? 'Tel: ' + settings.contact + '<br>' : ''} 
            ${settings.tax != '' ? 'Vat No: ' + settings.tax + '<br>' : ''} 
    </p>
    <hr>
    <left>
        <p>
        Reference : ${allTransactions[index].ref_number != "" ? allTransactions[index].ref_number : allTransactions[index].order} <br>
        Customer : ${allTransactions[index].customer == 0 ? 'visitor' : allTransactions[index].customer.name}<br>
        Cashier : ${allTransactions[index].user}<br>
        Date : ${moment(allTransactions[index].date).format('DD MMM YYYY HH:mm:ss')}<br>
        </p>

    </left>
    <hr>
    <table width="100%">
        <thead style="text-align: left;">
        <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
        </tr>
        </thead>
        <tbody>
        ${allTransactions[index].items.map(item => 
          `<tr><td>${item.product_name}</td><td>${item.quantity}</td><td>${Number(item.price) + settings.symbol}</td></tr>`).join("\n")}                
 
        <tr>                        
            <td><b>Subtotal</b></td>
            <td>:</td>
            <td><b>${allTransactions[index].subtotal}${settings.symbol}</b></td>
        </tr>
        <tr>
            <td>Discount</td>
            <td>:</td>
            <td>${allTransactions[index].discount > 0 ? Number(allTransactions[index].discount) + settings.symbol : ''}</td>
        </tr>
        
        ${settings.charge_tax ? 
        `<tr>
          <td>Vat(${settings.percentage})% </td>
          <td>:</td>
          <td>${Number(allTransactions[index].tax)}${settings.symbol}</td>
        </tr>` : ''}
    
        <tr>
            <td><h3>Total</h3></td>
            <td><h3>:</h3></td>
            <td>
                <h3>${allTransactions[index].total}${settings.symbol}</h3>
            </td>
        </tr>
        ${payment == 0 ? '' : allTransactions[index].paid != '' ? 
        `<tr>
          <td>Paid</td>
          <td>:</td>
          <td>${allTransactions[index].paid + settings.symbol}</td>
        </tr>
        <tr>
          <td>Rest</td>
          <td>:</td>
          <td>${Math.abs(allTransactions[index].change) + settings.symbol}</td>
        </tr>
        <tr>
          <td>Method</td>
          <td>:</td>
          <td>${allTransactions[index].payment_type == 2 ? "Card" : "Cash"}</td>
        </tr>` : ''}
        </tbody>
        </table>
        <br>
        <hr>
        <br>
        <p style="text-align: center;">
         ${settings.footer}
         </p>
        </div>`

    $('#viewTransaction').html('')
    $('#viewTransaction').html(receipt)

    $('#orderModal').modal('show')

}


$('#status').change(function () {
    by_status = $(this).find('option:selected').val()
    loadTransactions()
})



$('#tills').change(function () {
    by_till = $(this).find('option:selected').val()
    loadTransactions()
})


$('#users').change(function () {
    by_user = $(this).find('option:selected').val()
    loadTransactions()
})


$('#reportrange').on('apply.daterangepicker', function (ev, picker) {

    start = picker.startDate.format('DD MMM YYYY hh:mm A')
    end = picker.endDate.format('DD MMM YYYY hh:mm A')

    start_date = picker.startDate.toDate().toJSON()
    end_date = picker.endDate.toDate().toJSON()


    loadTransactions()
})


function authenticate() {
    $('#loading').append(
        `<div id="load"><form id="account"><div class="form-group"><input type="text" placeholder="Username" name="username" class="form-control"></div>
        <div class="form-group"><input type="password" placeholder="Password" name="password" class="form-control"></div>
        <div class="form-group"><input type="submit" class="btn btn-block btn-default" value="Login"></div></form>`
    )
}


$('body').on("submit", "#account", function (e) {
    e.preventDefault()
    let formData = $(this).serializeObject()

    if (formData.username == "" || formData.password == "") {

        new Alert(
            'Incomplete form!',
            auth_empty,
            'warning'
        )
    }
    else {

        $.ajax({
            url: api + 'users/login',
            type: 'POST',
            data: JSON.stringify(formData),
            contentType: 'application/json; charset=utf-8',
            cache: false,
            processData: false,
            success: function (data) {
                if (data._id) {
                    storage.set('auth', { auth: true })
                    storage.set('user', data)
                    ipcRenderer.send('app-reload', '')
                }
                else {
                    new Alert(
                        'Oops!',
                        auth_error,
                        'warning'
                    )
                }

            }, error: function (data) {
                console.log(data)
            }
        })
    }
})


$('#quit').click(function () {
    new Alert({
        title: 'Are you sure?',
        text: "You are about to close the application.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#5fbeaa',
        confirmButtonText: 'Close Application'
    }).then((result) => {

        if (result.value) {
            ipcRenderer.send('app-quit', '')
        }
    })
})

$('#categories').on('click', '.btn-categories', function(){

    if (this.id == 'all') {
        $('#parent > div').fadeIn(450)
    } else {
        var $el = $('.' + this.id).fadeIn(450)
        $('#parent > div').not($el).hide()
    }

    $("#categories .btn-categories").removeClass("active")
    $(this).addClass('active')

})


function searchProducts () {        
    $("#categories .btn-categories").removeClass("active")
    var matcher = new RegExp($("#search").val(), 'gi')
    $('.box').show().not(function(){
        return matcher.test($(this).find('.name, .sku').text())
    }).hide()
    $('.box').length == 1 && $('.box.sku').val() == $('#search').val() ? {} : {}
}

let $search = $("#search").on('input',function(){
    searchProducts();       
})


function searchOpenOrders() {
    $('.order').show().not(function(){
        return $(this).find('.ref_number').text().toLowerCase().includes($("#holdOrderInput").val().toLowerCase())
    }).hide()
}

var $searchHoldOrder = $("#holdOrderInput").on('input',function () {
    searchOpenOrders()
})


$('body').on('click', '.holdOrderKeyboard .key', function() {
    if($("#holdOrderInput").is(":focus")) {
        searchOpenOrders(); 
    }          
})


function searchCustomerOrders() {
    var matcher = new RegExp($("#holdCustomerOrderInput").val(), 'gi')
    $('.customer-order').show().not(function(){
        return matcher.test($(this).find('.customer_name').text())
    }).hide()
}

var $searchCustomerOrder = $("#holdCustomerOrderInput").on('input',function () {
    searchCustomerOrders()
})


$('body').on('click', '.customerOrderKeyboard .key', function() {
    if($("#holdCustomerOrderInput").is(":focus")) {
        searchCustomerOrders()
    }          
})


var $list = $('.list-group-item').click(function () {
   $list.removeClass('active')
   $(this).addClass('active')
   if(this.id == 'check'){
        $("#cardInfo").show()
        $("#cardInfo .input-group-addon").text("Check Info")
   }else if(this.id == 'card'){
       $("#cardInfo").show()
       $("#cardInfo .input-group-addon").text("Card Info")
   }else if(this.id == 'cash'){
       $("#cardInfo").hide()
   }
})

$.fn.go = function (value,isDueInput) {
    if(isDueInput){
        $("#refNumber").val($("#refNumber").val()+""+value)
    }else{
        $("#payment").val($("#payment").val()+""+value)
        $(this).calculateChange()
    }
}


$.fn.digits = function(){
    $("#payment").val($("#payment").val()+".")
    $(this).calculateChange()
}

$.fn.calculateChange = function () {
    $('#change').text(Number($('#payablePrice').val()) - (Number($('#payment').val()) + Number($('#paid').text())))
}

function version ($1) {
    fetch(api+'')
}