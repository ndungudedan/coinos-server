import bcrypt from 'bcrypt'
import { resolver, defaultArgs, defaultListArgs, attributeFields } from 'graphql-sequelize'
import {
    graphql,
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLInputObjectType,
    GraphQLString,
    GraphQLInt,
    GraphQLNonNull,
    GraphQLList
} from 'graphql'

const l = console.log

module.exports = (db, gqltypes, lnrpc) => {
  const UserInputType = new GraphQLInputObjectType({
    name: 'UserInput',
    desc: 'UserInput',
    fields: {
      ...attributeFields(db['User'], { exclude: ['id'] }),
    }
  })

  return new GraphQLObjectType({
    name: 'mutation',
    fields: {
      createUser: {
        type: gqltypes['users'],
        args: {
          user: {
            type: UserInputType
          }
        },
        resolve: async (root, { user }) => {
          if (!user.username) throw new Error('Username required')
          if (user.password.length < 2) throw new Error('Password too short')

          let exists = await db['User'].count({ where: { username: user.username } })
          if (exists) throw new Error('Username taken')

          user.address = (await lnrpc.newAddress({ type: 1 }, lnrpc.meta)).address
          user.password = await bcrypt.hash(user.password, 1)
          user.balance = 0
          return db['User'].create(user)
        }
      },
      updateUser: {
        type: gqltypes['users'],
        args: {
          user: {
            type: UserInputType
          }
        },
        resolve: async (root, { user }) => {
          await db['User'].update(user, { where: { username: user.username } })
        }
      },
    }
  })
}