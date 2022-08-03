import type { NextPage } from 'next'
import React from 'react'

type ContainerProps = {
  children: React.ReactNode
}

const Container: React.FC<ContainerProps> = ({ children }) => {
  return (
    <div className="flex h-full w-full flex-col select-none">{children}</div>
  )
}
const Home: NextPage = () => {
  return (
    <Container>
      <h1 className="text-3xl font-bold underline">Hello world!</h1>
    </Container>
  )
}

export default Home
