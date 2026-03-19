package com.mana.services

import io.github.cdimascio.dotenv.Dotenv
import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.PushService
import nl.martijndwars.webpush.Subscription
import org.bouncycastle.jce.provider.BouncyCastleProvider
import java.security.Security

class WebPushService(private val dotenv: Dotenv) {

    private val pushService: PushService by lazy {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(BouncyCastleProvider())
        }
        PushService(
            dotenv["VAPID_PUBLIC_KEY", ""],
            dotenv["VAPID_PRIVATE_KEY", ""],
            dotenv["VAPID_SUBJECT", "mailto:admin@mana.app"]
        )
    }

    fun sendPush(endpoint: String, p256dh: String, auth: String, payload: String): Boolean {
        return try {
            val subscription = Subscription(endpoint, Subscription.Keys(p256dh, auth))
            val notification = Notification(subscription, payload)
            val response = pushService.send(notification)
            response.statusLine.statusCode in 200..299
        } catch (e: Exception) {
            false
        }
    }
}
