package pl.myslnik.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [EntryEntity::class, CategoryEntity::class],
    version = 1,
    exportSchema = true
)
abstract class MyslnikDatabase : RoomDatabase() {
    abstract fun entryDao(): EntryDao
    abstract fun categoryDao(): CategoryDao

    companion object {
        @Volatile private var instance: MyslnikDatabase? = null

        fun get(context: Context): MyslnikDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    MyslnikDatabase::class.java,
                    "myslnik.db"
                )
                    // Dane są święte: ŻADNEGO fallbackToDestructiveMigration.
                    // Zmiany schematu wyłącznie przez jawne migracje.
                    .build()
                    .also { instance = it }
            }
    }
}
