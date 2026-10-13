package com.slowatcoding.combust

import android.app.Application

class CombustApp : Application() {
    val controller: AppController by lazy { AppController(this) }

    override fun onCreate() {
        super.onCreate()
        // Create eagerly so sync triggers are registered even when started by WorkManager.
        controller
    }
}
