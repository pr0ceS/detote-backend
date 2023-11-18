require('dotenv').config()
const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const fs = require('fs');
const path = require('path');

const moment = require('moment');

const mailerSend = new MailerSend({
	apiKey: process.env.MAIL_KEY,
});

const SenderMail = process.env.SENDER_MAIL;
const SenderFrom = process.env.SENDER_FROM;
const PaymentReceiveMail = process.env.PAYMENT_RECEIVE_MAIL;
const OrderShippedMail = process.env.ORDER_SHIPPED_MAIL;
const OrderDeliveredMail = process.env.ORDER_DELIVERED_MAIL;


const sendPaymentReceive = async (email, subject, order) => {
	try {
		const sentFrom = new Sender(SenderMail, SenderFrom)

		const recipients = [
			new Recipient(await email, await email)
		];
		
		const variables = [
			{
				email: await email,
				substitutions: [
					{
						var: 'order_number',
						value: await order?.reference
					}
				],
			}
		];
		
		const emailParams = await new EmailParams()
			.setFrom(sentFrom)
			.setTo(recipients)
			.setReplyTo(sentFrom)
			.setSubject(await subject)
			.setTemplateId(PaymentReceiveMail)
			.setVariables(variables)
			.setAttachments([
				{
					filename: `invoice_F0000${await invoice?.invoiceNumber}_${await invoice?.reference}_${moment(await invoice?.Date).locale("nl").format('L')}.pdf`,
					content: fs.readFileSync(path.join(__dirname + `/../pdf/invoice_F0000${await invoice?.invoiceNumber}_${await invoice?.reference}_${moment(await invoice?.Date).locale("nl").format('L')}.pdf`)).toString('base64'),
					type: "application/pdf"
				}
			]);
		
		await mailerSend.email.send(emailParams);
	} catch (error) {
		console.error(error);
	}
}

const sendOrderShipped = async (email, subject, order) => {
	try {
		const sentFrom = new Sender("noreply@rcdriftauto.nl", "RCDriftAuto.nl")

		const recipients = [
			new Recipient(await email, await email)
		];
		
		const variables = [
			{
				email: await email,
				substitutions: [
					{
						var: 'delivery_date',
						value: moment(Date.now()).add(5, 'days').locale("en").format('LL')
					},
					{
						var: 'tracking_code',
						value: order.tracking_code
					}
				],
			}
		];
		
		const emailParams = await new EmailParams()
			.setFrom(sentFrom)
			.setTo(recipients)
			.setReplyTo(sentFrom)
			.setSubject(await subject)
			.setTemplateId(OrderShippedMail)
			.setVariables(variables)
		
		await mailerSend.email.send(emailParams);
	} catch (error) {
		console.log(error);
	}
}

const sendOrderDelivered = async (email, subject, invoice) => {
	try {
		const sentFrom = new Sender("noreply@rcdriftauto.nl", "RCDriftAuto.nl")

		const recipients = [
			new Recipient(email, await invoice?.shipping?.name ? await invoice?.shipping?.name : await email)
		];
		
		const emailParams = await new EmailParams()
			.setFrom(sentFrom)
			.setTo(recipients)
			.setReplyTo(sentFrom)
			.setSubject(await subject)
			.setTemplateId(OrderDeliveredMail)
		
		await mailerSend.email.send(emailParams);
	} catch (error) {
		console.log(error);
	}
}

module.exports = {
	sendPaymentReceive,
	sendOrderShipped,
	sendOrderDelivered,
}